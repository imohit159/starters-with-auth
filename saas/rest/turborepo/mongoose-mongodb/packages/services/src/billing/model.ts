import { z } from "zod";
import { subscriptionStatusSchema } from "../orgs/model";
import { objectIdSchema } from "../ids";

export const billingOrganizationInputSchema = z.object({
  organizationId: objectIdSchema,
});
export type BillingOrganizationInputSchema = z.infer<typeof billingOrganizationInputSchema>;

export const checkoutOutputSchema = z.object({
  url: z.string().url(),
});
export type CheckoutOutputSchema = z.infer<typeof checkoutOutputSchema>;

export const portalOutputSchema = z.object({
  url: z.string().url(),
});
export type PortalOutputSchema = z.infer<typeof portalOutputSchema>;

export const subscriptionOutputSchema = z.object({
  organizationId: z.string(),
  status: subscriptionStatusSchema,
  subscriptionEndsAt: z.string().nullable(),
  isSubscribed: z.boolean(),
  stripeCustomerId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
});
export type SubscriptionOutputSchema = z.infer<typeof subscriptionOutputSchema>;

export const webhookAckOutputSchema = z.object({
  received: z.literal(true),
  duplicate: z.boolean(),
});
export type WebhookAckOutputSchema = z.infer<typeof webhookAckOutputSchema>;
