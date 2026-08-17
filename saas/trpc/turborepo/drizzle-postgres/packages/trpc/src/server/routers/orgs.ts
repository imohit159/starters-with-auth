import {
  acceptInvite,
  acceptInviteInputSchema,
  createOrganization,
  createOrganizationInputSchema,
  getOrganization,
  inviteCreatedOutputSchema,
  inviteMember,
  inviteMemberInputSchema,
  listMembers,
  listMembersOutputSchema,
  listOrganizations,
  organizationIdInputSchema,
  organizationOutputSchema,
  removeMember,
  removeMemberInputSchema,
  revokeInvite,
  revokeInviteInputSchema,
  updateMemberRole,
  updateMemberRoleInputSchema,
} from "@repo/services";
import { z } from "../schema";
import { protectedProcedure, router } from "../trpc";

export const orgsRouter = router({
  list: protectedProcedure.output(z.array(organizationOutputSchema)).query(async ({ ctx }) => {
    return listOrganizations(ctx.user.id);
  }),

  get: protectedProcedure
    .input(organizationIdInputSchema)
    .output(organizationOutputSchema)
    .query(async ({ ctx, input }) => {
      return getOrganization(ctx.user.id, input.organizationId);
    }),

  create: protectedProcedure
    .input(createOrganizationInputSchema)
    .output(organizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return createOrganization(ctx.user.id, input);
    }),

  members: protectedProcedure
    .input(organizationIdInputSchema)
    .output(listMembersOutputSchema)
    .query(async ({ ctx, input }) => {
      return listMembers(ctx.user.id, input.organizationId);
    }),

  invite: protectedProcedure
    .input(inviteMemberInputSchema)
    .output(inviteCreatedOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return inviteMember(ctx.user.id, input);
    }),

  acceptInvite: protectedProcedure
    .input(acceptInviteInputSchema)
    .output(organizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return acceptInvite(ctx.user.id, input);
    }),

  revokeInvite: protectedProcedure
    .input(revokeInviteInputSchema)
    .output(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return revokeInvite(ctx.user.id, input);
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleInputSchema)
    .output(z.object({ userId: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return updateMemberRole(ctx.user.id, input);
    }),

  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return removeMember(ctx.user.id, input);
    }),
});
