import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  INVITE_STATUS,
  memberships,
  ORG_ROLE,
  organizationInvites,
  organizations,
  users,
} from "../../database";
import { AppError } from "../../shared/errors/app-error";
import { generateOpaqueToken, hashToken } from "../../utils/crypto";
import { sendMail } from "../../utils/mailer";
import { env } from "../../config/env";
import {
  canManageOrg,
  isSubscriptionActive,
  toInviteOutput,
  toOrganizationOutput,
  type AcceptInviteInputSchema,
  type CreateOrganizationInputSchema,
  type InviteMemberInputSchema,
  type MembershipContext,
  type RemoveMemberInputSchema,
  type RevokeInviteInputSchema,
  type UpdateMemberRoleInputSchema,
} from "./model";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  const [row] = await db
    .select({ organization: organizations, membership: memberships })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this organization");
  }
  return row;
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
  const [org] = await db
    .insert(organizations)
    .values({ name: input.name, slug: slugify(input.name) })
    .returning();

  await db.insert(memberships).values({
    organizationId: org.id,
    userId,
    role: ORG_ROLE.owner,
  });

  return toOrganizationOutput(org, ORG_ROLE.owner);
}

/**
 * Lists organizations the user belongs to. Does not accept a client org id.
 */
export async function listOrganizations(userId: string) {
  const rows = await db
    .select({ organization: organizations, membership: memberships })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));

  return rows.map((row) => toOrganizationOutput(row.organization, row.membership.role));
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

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organization.id), eq(memberships.userId, existingUser.id)))
      .limit(1);
    if (existingMembership) {
      throw new AppError(409, "ALREADY_MEMBER", "That user is already a member");
    }
  }

  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [pending] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, organization.id),
        eq(organizationInvites.email, email),
        eq(organizationInvites.status, INVITE_STATUS.pending),
      ),
    )
    .limit(1);

  let invite;
  if (pending) {
    const [updated] = await db
      .update(organizationInvites)
      .set({ role: input.role, tokenHash, expiresAt, invitedByUserId: userId })
      .where(eq(organizationInvites.id, pending.id))
      .returning();
    invite = updated;
  } else {
    const [created] = await db
      .insert(organizationInvites)
      .values({
        organizationId: organization.id,
        email,
        role: input.role,
        tokenHash,
        invitedByUserId: userId,
        expiresAt,
      })
      .returning();
    invite = created;
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
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }

  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.tokenHash, hashToken(input.token)),
        eq(organizationInvites.status, INVITE_STATUS.pending),
        isNull(organizationInvites.acceptedAt),
        gt(organizationInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invite) {
    throw new AppError(400, "INVALID_TOKEN", "Invite is invalid or expired");
  }
  if (invite.email !== user.email) {
    throw new AppError(403, "FORBIDDEN", "This invite was sent to a different email");
  }

  const [existing] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.organizationId, invite.organizationId), eq(memberships.userId, userId)))
    .limit(1);

  await db.transaction(async (tx) => {
    if (!existing) {
      await tx.insert(memberships).values({
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      });
    }
    await tx
      .update(organizationInvites)
      .set({ status: INVITE_STATUS.accepted, acceptedAt: new Date() })
      .where(eq(organizationInvites.id, invite.id));
  });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, invite.organizationId)).limit(1);
  return toOrganizationOutput(org, existing?.role ?? invite.role);
}

export async function revokeInvite(userId: string, input: RevokeInviteInputSchema) {
  await requireOrgManager(userId, input.organizationId);
  const [invite] = await db
    .update(organizationInvites)
    .set({ status: INVITE_STATUS.revoked })
    .where(
      and(
        eq(organizationInvites.id, input.inviteId),
        eq(organizationInvites.organizationId, input.organizationId),
        eq(organizationInvites.status, INVITE_STATUS.pending),
      ),
    )
    .returning();
  if (!invite) {
    throw new AppError(404, "NOT_FOUND", "Invite not found");
  }
  return { message: "Invite revoked" };
}

export async function listMembers(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  const memberRows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: memberships.role,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, organizationId));

  const inviteRows = await db
    .select()
    .from(organizationInvites)
    .where(
      and(eq(organizationInvites.organizationId, organizationId), eq(organizationInvites.status, INVITE_STATUS.pending)),
    );

  return {
    members: memberRows.map((row) => ({
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    })),
    invites: inviteRows.map(toInviteOutput),
  };
}

async function countOwners(organizationId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, ORG_ROLE.owner)));
  return Number(row?.count ?? 0);
}

/**
 * Updates a member role. The last owner cannot be demoted.
 */
export async function updateMemberRole(actorUserId: string, input: UpdateMemberRoleInputSchema) {
  const { membership: actor } = await requireOrgManager(actorUserId, input.organizationId);

  if (actor.role !== ORG_ROLE.owner && input.role === ORG_ROLE.owner) {
    throw new AppError(403, "FORBIDDEN", "Only an owner can assign the owner role");
  }

  const [target] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.organizationId, input.organizationId), eq(memberships.userId, input.userId)))
    .limit(1);
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "Member not found");
  }

  if (target.role === ORG_ROLE.owner && input.role !== ORG_ROLE.owner) {
    if ((await countOwners(input.organizationId)) <= 1) {
      throw new AppError(409, "LAST_OWNER", "The organization must keep at least one owner");
    }
  }

  const [updated] = await db
    .update(memberships)
    .set({ role: input.role })
    .where(eq(memberships.id, target.id))
    .returning();

  return { userId: updated.userId, role: updated.role };
}

/**
 * Removes a member. The last owner cannot leave.
 */
export async function removeMember(actorUserId: string, input: RemoveMemberInputSchema) {
  const { membership: actor } = await requireOrgManager(actorUserId, input.organizationId);

  const [target] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.organizationId, input.organizationId), eq(memberships.userId, input.userId)))
    .limit(1);
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "Member not found");
  }

  if (target.role === ORG_ROLE.owner && actor.role !== ORG_ROLE.owner && actorUserId !== input.userId) {
    throw new AppError(403, "FORBIDDEN", "Only an owner can remove another owner");
  }

  if (target.role === ORG_ROLE.owner && (await countOwners(input.organizationId)) <= 1) {
    throw new AppError(409, "LAST_OWNER", "The organization must keep at least one owner");
  }

  await db.delete(memberships).where(eq(memberships.id, target.id));
  return { message: "Member removed" };
}

export { canManageOrg, isSubscriptionActive, toOrganizationOutput };
