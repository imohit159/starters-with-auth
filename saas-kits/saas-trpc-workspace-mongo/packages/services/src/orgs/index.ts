import { randomBytes } from "node:crypto";
import {
  INVITE_STATUS,
  Membership,
  ORG_ROLE,
  Organization,
  OrganizationInvite,
  User,
  type MembershipDocument,
  type OrganizationDocument,
} from "@repo/database";
import { AppError } from "@repo/logger";
import { generateOpaqueToken, hashToken } from "../auth/crypto";
import { sendMail } from "../clients/mailer";
import { env } from "../env";
import {
  canManageOrg,
  isSubscriptionActive,
  toInviteOutput,
  toOrganizationOutput,
  type AcceptInviteInputSchema,
  type CreateOrganizationInputSchema,
  type InviteMemberInputSchema,
  type RemoveMemberInputSchema,
  type RevokeInviteInputSchema,
  type UpdateMemberRoleInputSchema,
} from "./model";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type MembershipContext = {
  organization: OrganizationDocument;
  membership: MembershipDocument;
};

function slugify(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/**
 * Loads an organization and the caller's membership.
 * Never trusts a client-supplied org id without this check.
 */
export async function requireMembership(userId: string, organizationId: string): Promise<MembershipContext> {
  const membership = await Membership.findOne({ userId, organizationId });
  const organization = membership ? await Organization.findById(membership.organizationId) : null;

  if (!membership || !organization) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this organization");
  }
  return { organization, membership };
}

export async function requireOrgManager(userId: string, organizationId: string) {
  const ctx = await requireMembership(userId, organizationId);
  if (!canManageOrg(ctx.membership.role)) {
    throw new AppError(403, "FORBIDDEN", "Owner or admin role required");
  }
  return ctx;
}

/**
 * Creates an organization and makes the caller the owner.
 */
export async function createOrganization(userId: string, input: CreateOrganizationInputSchema) {
  const org = await Organization.create({ name: input.name, slug: slugify(input.name) });

  await Membership.create({
    organizationId: org._id,
    userId,
    role: ORG_ROLE.owner,
  });

  return toOrganizationOutput(org, ORG_ROLE.owner);
}

/**
 * Lists organizations the user belongs to. Does not accept a client org id.
 */
export async function listOrganizations(userId: string) {
  const rows = await Membership.find({ userId });
  const orgIds = rows.map((row) => row.organizationId);
  const orgs = await Organization.find({ _id: { $in: orgIds } });
  const orgById = new Map(orgs.map((org) => [org._id.toString(), org]));

  return rows.flatMap((row) => {
    const org = orgById.get(row.organizationId.toString());
    return org ? [toOrganizationOutput(org, row.role)] : [];
  });
}

export async function getOrganization(userId: string, organizationId: string) {
  const { organization, membership } = await requireMembership(userId, organizationId);
  return toOrganizationOutput(organization, membership.role);
}

/**
 * Invites an email into an organization as admin or member.
 * Rotates the token if a pending invite already exists for that email.
 */
export async function inviteMember(userId: string, input: InviteMemberInputSchema) {
  const { organization } = await requireOrgManager(userId, input.organizationId);
  const email = input.email;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      organizationId: organization._id,
      userId: existingUser._id,
    });
    if (existingMembership) {
      throw new AppError(409, "ALREADY_MEMBER", "That user is already a member");
    }
  }

  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const pending = await OrganizationInvite.findOne({
    organizationId: organization._id,
    email,
    status: INVITE_STATUS.pending,
  });

  let invite;
  if (pending) {
    pending.role = input.role;
    pending.tokenHash = tokenHash;
    pending.expiresAt = expiresAt;
    pending.set("invitedByUserId", userId);
    await pending.save();
    invite = pending;
  } else {
    invite = await OrganizationInvite.create({
      organizationId: organization._id,
      email,
      role: input.role,
      tokenHash,
      invitedByUserId: userId,
      expiresAt,
    });
  }

  const acceptUrl = `${env.WEB_ORIGIN}/invite/accept?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: `Join ${organization.name}`,
    text: `You were invited to ${organization.name} as ${input.role}. Accept: ${acceptUrl}`,
  });

  return {
    invite: toInviteOutput(invite),
    message: "Invite sent",
  };
}

/**
 * Accepts a pending invite. The signed-in user's email must match the invite.
 */
export async function acceptInvite(userId: string, input: AcceptInviteInputSchema) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }

  const invite = await OrganizationInvite.findOne({
    tokenHash: hashToken(input.token),
    status: INVITE_STATUS.pending,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw new AppError(400, "INVALID_TOKEN", "Invite is invalid or expired");
  }
  if (invite.email !== user.email) {
    throw new AppError(403, "FORBIDDEN", "This invite was sent to a different email");
  }

  const existing = await Membership.findOne({
    organizationId: invite.organizationId,
    userId,
  });

  if (!existing) {
    await Membership.create({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
    });
  }

  invite.status = INVITE_STATUS.accepted;
  invite.acceptedAt = new Date();
  await invite.save();

  const org = await Organization.findById(invite.organizationId);
  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  return toOrganizationOutput(org, existing?.role ?? invite.role);
}

export async function revokeInvite(userId: string, input: RevokeInviteInputSchema) {
  await requireOrgManager(userId, input.organizationId);
  const invite = await OrganizationInvite.findOneAndUpdate(
    {
      _id: input.inviteId,
      organizationId: input.organizationId,
      status: INVITE_STATUS.pending,
    },
    { $set: { status: INVITE_STATUS.revoked } },
    { returnDocument: "after" },
  );
  if (!invite) {
    throw new AppError(404, "NOT_FOUND", "Invite not found");
  }
  return { message: "Invite revoked" };
}

export async function listMembers(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  const memberRows = await Membership.find({ organizationId });
  const userIds = memberRows.map((row) => row.userId);
  const users = await User.find({ _id: { $in: userIds } });
  const userById = new Map(users.map((row) => [row._id.toString(), row]));

  const inviteRows = await OrganizationInvite.find({
    organizationId,
    status: INVITE_STATUS.pending,
  });

  return {
    members: memberRows.flatMap((row) => {
      const member = userById.get(row.userId.toString());
      if (!member) {
        return [];
      }
      return [
        {
          userId: member._id.toString(),
          email: member.email,
          displayName: member.displayName,
          role: row.role,
          createdAt: row.createdAt.toISOString(),
        },
      ];
    }),
    invites: inviteRows.map(toInviteOutput),
  };
}

async function countOwners(organizationId: string) {
  return Membership.countDocuments({ organizationId, role: ORG_ROLE.owner });
}

/**
 * Updates a member role. The last owner cannot be demoted.
 */
export async function updateMemberRole(actorUserId: string, input: UpdateMemberRoleInputSchema) {
  const { membership: actor } = await requireOrgManager(actorUserId, input.organizationId);

  if (actor.role !== ORG_ROLE.owner && input.role === ORG_ROLE.owner) {
    throw new AppError(403, "FORBIDDEN", "Only an owner can assign the owner role");
  }

  const target = await Membership.findOne({
    organizationId: input.organizationId,
    userId: input.userId,
  });
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "Member not found");
  }

  if (target.role === ORG_ROLE.owner && input.role !== ORG_ROLE.owner) {
    if ((await countOwners(input.organizationId)) <= 1) {
      throw new AppError(409, "LAST_OWNER", "The organization must keep at least one owner");
    }
  }

  target.role = input.role;
  await target.save();

  return { userId: target.userId.toString(), role: target.role };
}

/**
 * Removes a member. The last owner cannot leave.
 */
export async function removeMember(actorUserId: string, input: RemoveMemberInputSchema) {
  const { membership: actor } = await requireOrgManager(actorUserId, input.organizationId);

  const target = await Membership.findOne({
    organizationId: input.organizationId,
    userId: input.userId,
  });
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "Member not found");
  }

  if (target.role === ORG_ROLE.owner && actor.role !== ORG_ROLE.owner && actorUserId !== input.userId) {
    throw new AppError(403, "FORBIDDEN", "Only an owner can remove another owner");
  }

  if (target.role === ORG_ROLE.owner && (await countOwners(input.organizationId)) <= 1) {
    throw new AppError(409, "LAST_OWNER", "The organization must keep at least one owner");
  }

  await target.deleteOne();
  return { message: "Member removed" };
}

export { canManageOrg, isSubscriptionActive, toOrganizationOutput };
