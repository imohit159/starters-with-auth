import type { Request, Response } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleStripeWebhook,
  type BillingOrganizationInputSchema,
} from "@repo/services";

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.header("stripe-signature");
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const result = await handleStripeWebhook(payload, signature);
  res.json(result);
}

export async function subscription(req: Request, res: Response) {
  const input = req.body as BillingOrganizationInputSchema;
  const subscription = await getSubscription(req.user!.id, input.organizationId);
  res.json({ subscription });
}

export async function checkout(req: Request, res: Response) {
  const result = await createCheckoutSession(req.user!.id, req.body as BillingOrganizationInputSchema);
  res.json(result);
}

export async function portal(req: Request, res: Response) {
  const result = await createPortalSession(req.user!.id, req.body as BillingOrganizationInputSchema);
  res.json(result);
}
