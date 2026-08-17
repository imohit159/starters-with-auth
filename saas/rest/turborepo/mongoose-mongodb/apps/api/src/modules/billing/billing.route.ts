import express, { Router } from "express";
import { billingOrganizationInputSchema } from "@repo/services";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validate } from "../../shared/middleware/validate";
import * as billingController from "./billing.controller";

export const billingWebhookRouter = Router();
billingWebhookRouter.post("/", express.raw({ type: "application/json" }), billingController.stripeWebhook);

export const billingSessionRouter = Router({ mergeParams: true });
billingSessionRouter.use(requireAuth);
billingSessionRouter.get("/", validate(billingOrganizationInputSchema, "params"), billingController.subscription);
billingSessionRouter.post(
  "/checkout",
  validate(billingOrganizationInputSchema, "params"),
  billingController.checkout,
);
billingSessionRouter.post("/portal", validate(billingOrganizationInputSchema, "params"), billingController.portal);
