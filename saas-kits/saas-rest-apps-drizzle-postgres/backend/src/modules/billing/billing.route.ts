import express, { Router } from "express";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validateAll } from "../../shared/middleware/validate";
import * as billingController from "./billing.controller";
import { billingOrganizationInputSchema } from "./model";

export const billingWebhookRouter = Router();
billingWebhookRouter.post("/", express.raw({ type: "application/json" }), billingController.stripeWebhook);

export const billingSessionRouter = Router({ mergeParams: true });
billingSessionRouter.get("/", requireAuth, validateAll(billingOrganizationInputSchema), billingController.subscription);
billingSessionRouter.post(
  "/checkout",
  requireAuth,
  validateAll(billingOrganizationInputSchema),
  billingController.checkout,
);
billingSessionRouter.post("/portal", requireAuth, validateAll(billingOrganizationInputSchema), billingController.portal);
