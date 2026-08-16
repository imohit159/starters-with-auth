import { z } from "zod";
import { orgRoleSchema, subscriptionStatusSchema } from "../orgs/model";
import { userOutputSchema } from "../users/model";

export const adminSearchUsersInputSchema = z.object({
  email: z.string().trim().min(1).max(200),
});
export type AdminSearchUsersInputSchema = z.infer<typeof adminSearchUsersInputSchema>;

export const adminUserIdInputSchema = z.object({
  userId: z.string().uuid(),
});
export type AdminUserIdInputSchema = z.infer<typeof adminUserIdInputSchema>;

export const adminGrantAccessInputSchema = z.object({
  organizationId: z.string().uuid(),
  days: z.number().int().min(1).max(365).default(30),
});
export type AdminGrantAccessInputSchema = z.infer<typeof adminGrantAccessInputSchema>;

export const adminRevokeAccessInputSchema = z.object({
  organizationId: z.string().uuid(),
});
export type AdminRevokeAccessInputSchema = z.infer<typeof adminRevokeAccessInputSchema>;

export const adminUserOrgOutputSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  role: orgRoleSchema,
  subscriptionStatus: subscriptionStatusSchema,
  subscriptionEndsAt: z.string().nullable(),
  isSubscribed: z.boolean(),
});
export type AdminUserOrgOutputSchema = z.infer<typeof adminUserOrgOutputSchema>;

export const adminSearchUsersOutputSchema = z.object({
  users: z.array(userOutputSchema),
});
export type AdminSearchUsersOutputSchema = z.infer<typeof adminSearchUsersOutputSchema>;

export const adminUserDetailOutputSchema = z.object({
  user: userOutputSchema,
  organizations: z.array(adminUserOrgOutputSchema),
});
export type AdminUserDetailOutputSchema = z.infer<typeof adminUserDetailOutputSchema>;
