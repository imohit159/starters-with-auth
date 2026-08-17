import type { Request, Response } from "express";
import * as billingService from "./billing.service";
import type { BillingOrganizationInputSchema } from "./model";

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.header("stripe-signature");
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const result = await billingService.handleStripeWebhook(payload, signature);
  res.json(result);
}

export async function subscription(req: Request, res: Response) {
  const input = req.body as BillingOrganizationInputSchema;
  const subscription = await billingService.getSubscription(req.user!.id, input.organizationId);
  res.json({ subscription });
}

export async function checkout(req: Request, res: Response) {
  const result = await billingService.createCheckoutSession(
    req.user!.id,
    req.body as BillingOrganizationInputSchema,
  );
  res.json(result);
}

export async function portal(req: Request, res: Response) {
  const result = await billingService.createPortalSession(
    req.user!.id,
    req.body as BillingOrganizationInputSchema,
  );
  res.json(result);
}
