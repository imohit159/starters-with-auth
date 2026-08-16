import type Stripe from "stripe";
import {
  Organization,
  StripeEvent,
  SUBSCRIPTION_STATUS,
  User,
  type SubscriptionStatus,
} from "@repo/database";
import { AppError, logger } from "@repo/logger";
import {
  constructStripeWebhookEvent,
  createStripeCheckoutSession,
  createStripePortalSession,
} from "../clients/stripe";
import { env } from "../env";
import { isSubscriptionActive, requireMembership, requireOrgManager } from "../orgs";
import type { BillingOrganizationInputSchema } from "./model";

const KNOWN_STATUSES = new Set<string>(Object.values(SUBSCRIPTION_STATUS));

function toSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  if (value && KNOWN_STATUSES.has(value) && value !== SUBSCRIPTION_STATUS.none) {
    return value as SubscriptionStatus;
  }
  return SUBSCRIPTION_STATUS.none;
}

function periodEnd(subscription: Stripe.Subscription) {
  const seconds = subscription.items.data[0]?.current_period_end ?? subscription.ended_at;
  return seconds ? new Date(seconds * 1000) : null;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

function subscriptionId(value: string | Stripe.Subscription | null | undefined) {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return typeof parentSub === "string" ? parentSub : parentSub.id;
  }
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
  return subscriptionId(legacy);
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000;
}

/**
 * Starts Stripe Checkout for an org. Owner/admin only.
 * Entitlement is applied by the signed webhook, not by this mutation.
 */
export async function createCheckoutSession(userId: string, input: BillingOrganizationInputSchema) {
  const { organization } = await requireOrgManager(userId, input.organizationId);
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }

  if (isSubscriptionActive(organization.subscriptionStatus, organization.subscriptionEndsAt ?? null)) {
    throw new AppError(409, "ALREADY_SUBSCRIBED", "This organization already has an active subscription");
  }

  const session = await createStripeCheckoutSession({
    organizationId: organization._id.toString(),
    customerEmail: user.email,
    stripeCustomerId: organization.stripeCustomerId,
  });
  return { url: session.url };
}

/**
 * Opens the Stripe customer portal so the org can manage payment methods and cancel.
 */
export async function createPortalSession(userId: string, input: BillingOrganizationInputSchema) {
  const { organization } = await requireOrgManager(userId, input.organizationId);
  if (!organization.stripeCustomerId) {
    throw new AppError(409, "NO_CUSTOMER", "This organization has no Stripe customer yet");
  }
  const session = await createStripePortalSession(
    organization.stripeCustomerId,
    `${env.WEB_ORIGIN}/dashboard/billing`,
  );
  return { url: session.url };
}

export async function getSubscription(userId: string, organizationId: string) {
  const { organization } = await requireMembership(userId, organizationId);
  return {
    organizationId: organization._id.toString(),
    status: organization.subscriptionStatus,
    subscriptionEndsAt: organization.subscriptionEndsAt ? organization.subscriptionEndsAt.toISOString() : null,
    isSubscribed: isSubscriptionActive(organization.subscriptionStatus, organization.subscriptionEndsAt ?? null),
    stripeCustomerId: organization.stripeCustomerId ?? null,
    stripePriceId: organization.stripePriceId ?? null,
  };
}

async function findOrgForStripeEvent(event: Stripe.Event) {
  const object = event.data.object as {
    metadata?: { organizationId?: string };
    client_reference_id?: string | null;
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
    subscription?: string | Stripe.Subscription | null;
    id?: string;
  };

  const organizationId = object.metadata?.organizationId ?? object.client_reference_id ?? undefined;
  if (organizationId) {
    const org = await Organization.findById(organizationId);
    if (org) {
      return org;
    }
  }

  const subId =
    subscriptionId(object.subscription) ??
    (event.type.startsWith("customer.subscription.") ? object.id : null);
  if (subId) {
    const bySub = await Organization.findOne({ stripeSubscriptionId: subId });
    if (bySub) {
      return bySub;
    }
  }

  const custId = customerId(object.customer);
  if (custId) {
    const byCustomer = await Organization.findOne({ stripeCustomerId: custId });
    if (byCustomer) {
      return byCustomer;
    }
  }

  return null;
}

async function applySubscription(orgId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  await Organization.findByIdAndUpdate(orgId, {
    $set: {
      stripeCustomerId: customerId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: toSubscriptionStatus(subscription.status),
      subscriptionEndsAt: periodEnd(subscription),
    },
  });
}

async function applyCheckoutSession(orgId: string, session: Stripe.Checkout.Session) {
  await Organization.findByIdAndUpdate(orgId, {
    $set: {
      stripeCustomerId: customerId(session.customer),
      stripeSubscriptionId: subscriptionId(session.subscription),
      subscriptionStatus:
        session.status === "complete" ? SUBSCRIPTION_STATUS.active : SUBSCRIPTION_STATUS.incomplete,
    },
  });
}

/**
 * Verifies the Stripe signature, records the event id for idempotency, then updates org billing state.
 * Duplicate deliveries return success without applying the mutation twice.
 */
export async function handleStripeWebhook(payload: Buffer | string, signature: string | undefined) {
  if (!signature) {
    throw new AppError(400, "INVALID_SIGNATURE", "Missing Stripe-Signature header");
  }

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(payload, signature);
  } catch {
    throw new AppError(400, "INVALID_SIGNATURE", "Invalid Stripe webhook signature");
  }

  try {
    await StripeEvent.create({
      _id: event.id,
      type: event.type,
      payload: event.data.object as unknown as Record<string, unknown>,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      logger.info("stripe_webhook_duplicate", { eventId: event.id, type: event.type });
      return { received: true as const, duplicate: true };
    }
    throw error;
  }

  const org = await findOrgForStripeEvent(event);
  if (!org) {
    logger.warn("stripe_webhook_org_missing", { eventId: event.id, type: event.type });
    return { received: true as const, duplicate: false };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await applyCheckoutSession(org._id.toString(), event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(org._id.toString(), event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoiceSubscriptionId(invoice);
      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          stripeSubscriptionId: subId ?? org.stripeSubscriptionId,
          subscriptionStatus: SUBSCRIPTION_STATUS.active,
        },
      });
      break;
    }
    case "invoice.payment_failed":
      await Organization.findByIdAndUpdate(org._id, {
        $set: { subscriptionStatus: SUBSCRIPTION_STATUS.past_due },
      });
      break;
    default:
      logger.info("stripe_webhook_ignored", { eventId: event.id, type: event.type });
  }

  return { received: true as const, duplicate: false };
}
