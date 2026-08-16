import type { Request, Response } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleStripeWebhook,
} from "@repo/services";
import { routeParam } from "../../shared/http";

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.header("stripe-signature");
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const result = await handleStripeWebhook(payload, signature);
  res.json(result);
}

export async function subscription(req: Request, res: Response) {
  const result = await getSubscription(req.user!.id, routeParam(req, "organizationId"));
  res.json(result);
}

export async function checkout(req: Request, res: Response) {
  const result = await createCheckoutSession(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
  });
  res.json(result);
}

export async function portal(req: Request, res: Response) {
  const result = await createPortalSession(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
  });
  res.json(result);
}
