import express, { Router } from "express";
import * as billingController from "./billing.controller";

export const billingRouter = Router();

billingRouter.post("/", express.raw({ type: "application/json" }), billingController.stripeWebhook);
