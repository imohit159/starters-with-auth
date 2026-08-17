import type { Request, Response } from "express";
import { handleStripeWebhook } from "@repo/services";

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.header("stripe-signature");
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const result = await handleStripeWebhook(payload, signature);
  res.json(result);
}
