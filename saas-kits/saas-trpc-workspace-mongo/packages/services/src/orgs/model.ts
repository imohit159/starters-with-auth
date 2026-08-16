import { z } from "zod";
import {
  INVITE_STATUS,
  ORG_ROLE,
  SUBSCRIPTION_STATUS,
  type OrganizationDocument,
  type OrganizationInviteDocument,
  type OrgRole,
  type SubscriptionStatus,
} from "@repo/database";

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const orgRoleSchema = z.enum([ORG_ROLE.owner, ORG_ROLE.admin, ORG_ROLE.member]);
export const inviteRoleSchema = z.enum([ORG_ROLE.admin, ORG_ROLE.member]);
export const subscriptionStatusSchema = z.enum([
  SUBSCRIPTION_STATUS.none,
  SUBSCRIPTION_STATUS.incomplete,
  SUBSCRIPTION_STATUS.trialing,
  SUBSCRIPTION_STATUS.active,
  SUBSCRIPTION_STATUS.past_due,
  SUBSCRIPTION_STATUS.canceled,
  SUBSCRIPTION_STATUS.unpaid,
  SUBSCRIPTION_STATUS.paused,
]);

export const createOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
});
export type CreateOrganizationInputSchema = z.infer<typeof createOrganizationInputSchema>;

export const organizationIdInputSchema = z.object({
  organizationId: objectIdSchema,
});
export type OrganizationIdInputSchema = z.infer<typeof organizationIdInputSchema>;

export const inviteMemberInputSchema = z.object({
  organizationId: objectIdSchema,
  email: z.email().transform((value) => value.toLowerCase()),
  role: inviteRoleSchema.default(ORG_ROLE.member),
});
export type InviteMemberInputSchema = z.infer<typeof inviteMemberInputSchema>;

export const acceptInviteInputSchema = z.object({
  token: z.string().min(16),
});
export type AcceptInviteInputSchema = z.infer<typeof acceptInviteInputSchema>;

export const updateMemberRoleInputSchema = z.object({
  organizationId: objectIdSchema,
  userId: objectIdSchema,
  role: orgRoleSchema,
});
export type UpdateMemberRoleInputSchema = z.infer<typeof updateMemberRoleInputSchema>;

export const removeMemberInputSchema = z.object({
  organizationId: objectIdSchema,
  userId: objectIdSchema,
});
export type RemoveMemberInputSchema = z.infer<typeof removeMemberInputSchema>;

export const revokeInviteInputSchema = z.object({
  organizationId: objectIdSchema,
  inviteId: objectIdSchema,
});
export type RevokeInviteInputSchema = z.infer<typeof revokeInviteInputSchema>;

export const organizationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: orgRoleSchema,
  subscriptionStatus: subscriptionStatusSchema,
  subscriptionEndsAt: z.string().nullable(),
  isSubscribed: z.boolean(),
});
export type OrganizationOutputSchema = z.infer<typeof organizationOutputSchema>;

export const memberOutputSchema = z.object({
  userId: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: orgRoleSchema,
  createdAt: z.string(),
});
export type MemberOutputSchema = z.infer<typeof memberOutputSchema>;

export const inviteOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: orgRoleSchema,
  status: z.enum([INVITE_STATUS.pending, INVITE_STATUS.accepted, INVITE_STATUS.revoked]),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type InviteOutputSchema = z.infer<typeof inviteOutputSchema>;

export const listMembersOutputSchema = z.object({
  members: z.array(memberOutputSchema),
  invites: z.array(inviteOutputSchema),
});
export type ListMembersOutputSchema = z.infer<typeof listMembersOutputSchema>;

export const inviteCreatedOutputSchema = z.object({
  invite: inviteOutputSchema,
  message: z.string(),
});
export type InviteCreatedOutputSchema = z.infer<typeof inviteCreatedOutputSchema>;

const MANAGE_ROLES: OrgRole[] = [ORG_ROLE.owner, ORG_ROLE.admin];

export function canManageOrg(role: OrgRole) {
  return MANAGE_ROLES.includes(role);
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  subscriptionEndsAt: Date | null | undefined,
  now = new Date(),
) {
  if (status !== SUBSCRIPTION_STATUS.active && status !== SUBSCRIPTION_STATUS.trialing) {
    return false;
  }
  if (!subscriptionEndsAt) {
    return true;
  }
  return subscriptionEndsAt.getTime() > now.getTime();
}

export function toOrganizationOutput(
  org: OrganizationDocument,
  role: OrgRole,
): OrganizationOutputSchema {
  return {
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    role,
    subscriptionStatus: org.subscriptionStatus,
    subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
    isSubscribed: isSubscriptionActive(org.subscriptionStatus, org.subscriptionEndsAt),
  };
}

export function toInviteOutput(invite: OrganizationInviteDocument): InviteOutputSchema {
  return {
    id: invite._id.toString(),
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}
