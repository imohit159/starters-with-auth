import {
  billingOrganizationInputSchema,
  checkoutOutputSchema,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  portalOutputSchema,
  subscriptionOutputSchema,
} from "@repo/services";
import { protectedProcedure, router } from "../trpc";

export const billingRouter = router({
  getSubscription: protectedProcedure
    .input(billingOrganizationInputSchema)
    .output(subscriptionOutputSchema)
    .query(async ({ ctx, input }) => {
      return getSubscription(ctx.user.id, input.organizationId);
    }),

  createCheckoutSession: protectedProcedure
    .input(billingOrganizationInputSchema)
    .output(checkoutOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return createCheckoutSession(ctx.user.id, input);
    }),

  createPortalSession: protectedProcedure
    .input(billingOrganizationInputSchema)
    .output(portalOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return createPortalSession(ctx.user.id, input);
    }),
});
