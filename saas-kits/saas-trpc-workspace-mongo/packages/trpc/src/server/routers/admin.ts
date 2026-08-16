import {
  adminGrantAccessInputSchema,
  adminRevokeAccessInputSchema,
  adminSearchUsersInputSchema,
  adminSearchUsersOutputSchema,
  adminUserDetailOutputSchema,
  adminUserIdInputSchema,
  getUserDetail,
  grantOrgAccess,
  revokeOrgAccess,
  searchUsers,
  subscriptionOutputSchema,
} from "@repo/services";
import { protectedProcedure, router } from "../trpc";

export const adminRouter = router({
  searchUsers: protectedProcedure
    .input(adminSearchUsersInputSchema)
    .output(adminSearchUsersOutputSchema)
    .query(async ({ ctx, input }) => {
      return searchUsers(ctx.user.id, input);
    }),

  getUser: protectedProcedure
    .input(adminUserIdInputSchema)
    .output(adminUserDetailOutputSchema)
    .query(async ({ ctx, input }) => {
      return getUserDetail(ctx.user.id, input.userId);
    }),

  grantAccess: protectedProcedure
    .input(adminGrantAccessInputSchema)
    .output(subscriptionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return grantOrgAccess(ctx.user.id, input);
    }),

  revokeAccess: protectedProcedure
    .input(adminRevokeAccessInputSchema)
    .output(subscriptionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return revokeOrgAccess(ctx.user.id, input.organizationId);
    }),
});
