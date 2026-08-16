import { eq, ilike } from "drizzle-orm";
import {
  db,
  memberships,
  organizations,
  PLATFORM_ROLE,
  SUBSCRIPTION_STATUS,
  users,
} from "@repo/database";
import { AppError } from "@repo/logger";
import { isSubscriptionActive } from "../orgs";
import { toUserOutput } from "../users/model";
import type { AdminGrantAccessInputSchema, AdminSearchUsersInputSchema } from "./model";

async function requirePlatformAdmin(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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
  const pattern = `%${input.email.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const rows = await db.select().from(users).where(ilike(users.email, pattern)).limit(25);
  return { users: rows.map(toUserOutput) };
}

/**
 * Returns a user and every organization they belong to, including subscription state.
 */
export async function getUserDetail(actorUserId: string, userId: string) {
  await requirePlatformAdmin(actorUserId);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const rows = await db
    .select({ organization: organizations, membership: memberships })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));

  return {
    user: toUserOutput(user),
    organizations: rows.map((row) => ({
      organizationId: row.organization.id,
      name: row.organization.name,
      slug: row.organization.slug,
      role: row.membership.role,
      subscriptionStatus: row.organization.subscriptionStatus,
      subscriptionEndsAt: row.organization.subscriptionEndsAt
        ? row.organization.subscriptionEndsAt.toISOString()
        : null,
      isSubscribed: isSubscriptionActive(row.organization.subscriptionStatus, row.organization.subscriptionEndsAt),
    })),
  };
}

/**
 * Grants complimentary org access without Stripe. Maps the video's admin "add subscription" action.
 */
export async function grantOrgAccess(actorUserId: string, input: AdminGrantAccessInputSchema) {
  await requirePlatformAdmin(actorUserId);
  const endsAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
  const [org] = await db
    .update(organizations)
    .set({
      subscriptionStatus: SUBSCRIPTION_STATUS.active,
      subscriptionEndsAt: endsAt,
    })
    .where(eq(organizations.id, input.organizationId))
    .returning();
  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  return {
    organizationId: org.id,
    status: org.subscriptionStatus,
    subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
    isSubscribed: true,
    stripeCustomerId: org.stripeCustomerId,
    stripePriceId: org.stripePriceId,
  };
}

/**
 * Revokes complimentary or paid access immediately. Maps the video's admin "cancel subscription" action.
 */
export async function revokeOrgAccess(actorUserId: string, organizationId: string) {
  await requirePlatformAdmin(actorUserId);
  const [org] = await db
    .update(organizations)
    .set({
      subscriptionStatus: SUBSCRIPTION_STATUS.canceled,
      subscriptionEndsAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();
  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  return {
    organizationId: org.id,
    status: org.subscriptionStatus,
    subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
    isSubscribed: false,
    stripeCustomerId: org.stripeCustomerId,
    stripePriceId: org.stripePriceId,
  };
}
