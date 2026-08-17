import {
  Membership,
  Organization,
  PLATFORM_ROLE,
  SUBSCRIPTION_STATUS,
  User,
  type OrgRole,
} from "@repo/database";
import { AppError } from "@repo/logger";
import { isSubscriptionActive } from "../orgs";
import { toUserOutput } from "../users/model";
import type { AdminGrantAccessInputSchema, AdminSearchUsersInputSchema } from "./model";

async function requirePlatformAdmin(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  if (!user.roles.includes(PLATFORM_ROLE.admin)) {
    throw new AppError(403, "FORBIDDEN", "Platform admin required");
  }
  return user;
}

/**
 * Searches users by email for the platform admin dashboard.
 */
export async function searchUsers(actorUserId: string, input: AdminSearchUsersInputSchema) {
  await requirePlatformAdmin(actorUserId);
  const escaped = input.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await User.find({ email: { $regex: escaped, $options: "i" } }).limit(25);
  return { users: rows.map(toUserOutput) };
}

/**
 * Returns a user and every organization they belong to, including subscription state.
 */
export async function getUserDetail(actorUserId: string, userId: string) {
  await requirePlatformAdmin(actorUserId);
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const memberships = await Membership.find({ userId });
  const orgs = await Organization.find({ _id: { $in: memberships.map((row) => row.organizationId) } });
  const orgById = new Map(orgs.map((org) => [org._id.toString(), org]));

  return {
    user: toUserOutput(user),
    organizations: memberships.flatMap((membership) => {
      const organization = orgById.get(membership.organizationId.toString());
      if (!organization) {
        return [];
      }
      return [
        {
          organizationId: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          role: membership.role as OrgRole,
          subscriptionStatus: organization.subscriptionStatus,
          subscriptionEndsAt: organization.subscriptionEndsAt
            ? organization.subscriptionEndsAt.toISOString()
            : null,
          isSubscribed: isSubscriptionActive(
            organization.subscriptionStatus,
            organization.subscriptionEndsAt ?? null,
          ),
        },
      ];
    }),
  };
}

/**
 * Grants complimentary org access without Stripe. Maps the video's admin "add subscription" action.
 */
export async function grantOrgAccess(actorUserId: string, input: AdminGrantAccessInputSchema) {
  await requirePlatformAdmin(actorUserId);
  const endsAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
  const org = await Organization.findByIdAndUpdate(
    input.organizationId,
    {
      $set: {
        subscriptionStatus: SUBSCRIPTION_STATUS.active,
        subscriptionEndsAt: endsAt,
      },
    },
    { new: true },
  );
  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  return {
    organizationId: org._id.toString(),
    status: org.subscriptionStatus,
    subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
    isSubscribed: true,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripePriceId: org.stripePriceId ?? null,
  };
}

/**
 * Revokes complimentary or paid access immediately. Maps the video's admin "cancel subscription" action.
 */
export async function revokeOrgAccess(actorUserId: string, organizationId: string) {
  await requirePlatformAdmin(actorUserId);
  const org = await Organization.findByIdAndUpdate(
    organizationId,
    {
      $set: {
        subscriptionStatus: SUBSCRIPTION_STATUS.canceled,
        subscriptionEndsAt: new Date(),
      },
    },
    { new: true },
  );
  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  return {
    organizationId: org._id.toString(),
    status: org.subscriptionStatus,
    subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
    isSubscribed: false,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripePriceId: org.stripePriceId ?? null,
  };
}
