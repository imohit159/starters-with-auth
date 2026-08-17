import {
  Membership,
  Organization,
  PLATFORM_ROLE,
  SUBSCRIPTION_STATUS,
  User,
} from "@repo/database";
import { AppError } from "@repo/logger";
import { isSubscriptionActive } from "../orgs";
import { toUserOutput } from "../users/model";
import type { AdminGrantAccessInputSchema, AdminSearchUsersInputSchema } from "./model";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const rows = await User.find({
    email: { $regex: escapeRegex(input.email), $options: "i" },
  }).limit(25);
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

  const rows = await Membership.find({ userId });
  const orgIds = rows.map((row) => row.organizationId);
  const orgs = await Organization.find({ _id: { $in: orgIds } });
  const orgById = new Map(orgs.map((org) => [org._id.toString(), org]));

  return {
    user: toUserOutput(user),
    organizations: rows.flatMap((row) => {
      const organization = orgById.get(row.organizationId.toString());
      if (!organization) {
        return [];
      }
      return [
        {
          organizationId: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          role: row.role,
          subscriptionStatus: organization.subscriptionStatus,
          subscriptionEndsAt: organization.subscriptionEndsAt
            ? organization.subscriptionEndsAt.toISOString()
            : null,
          isSubscribed: isSubscriptionActive(
            organization.subscriptionStatus,
            organization.subscriptionEndsAt,
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
    { returnDocument: "after" },
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
    { returnDocument: "after" },
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
