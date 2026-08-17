import Stripe from "stripe";
import { AppError } from "../shared/errors/app-error";
import { env } from "../config/env";

let stripe: Stripe | undefined;

function requireStripeSecret() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured");
  }
}

export function getStripe() {
  requireStripeSecret();
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export type CheckoutSessionInput = {
  organizationId: string;
  customerEmail: string;
  stripeCustomerId?: string | null;
};

export type CreatedCheckoutSession = {
  id: string;
  url: string;
};

/**
 * Creates a Stripe Checkout session in subscription mode for one org.
 * Organization id is stored on session and subscription metadata so webhooks can resolve tenancy.
 */
export async function createStripeCheckoutSession(
  input: CheckoutSessionInput,
): Promise<CreatedCheckoutSession> {
  if (!env.STRIPE_PRICE_ID) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe price is not configured");
  }
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: input.stripeCustomerId ?? undefined,
    customer_email: input.stripeCustomerId ? undefined : input.customerEmail,
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    client_reference_id: input.organizationId,
    metadata: { organizationId: input.organizationId },
    subscription_data: {
      metadata: { organizationId: input.organizationId },
    },
  });
  if (!session.url) {
    throw new AppError(502, "STRIPE_ERROR", "Stripe did not return a checkout URL");
  }
  return { id: session.id, url: session.url };
}

export async function createStripePortalSession(customerId: string, returnUrl: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export function constructStripeWebhookEvent(payload: Buffer | string, signature: string) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe webhook secret is not configured");
  }
  return Stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

export function generateStripeTestWebhookHeader(payload: string, secret: string) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}
