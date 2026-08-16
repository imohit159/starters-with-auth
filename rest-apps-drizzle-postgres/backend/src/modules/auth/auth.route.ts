import { Router } from "express";
import { authRateLimiter } from "../../shared/middleware/rate-limit";
import { validate } from "../../shared/middleware/validate";
import * as authController from "./auth.controller";
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
} from "./model";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate(registerInputSchema), authController.register);
authRouter.post("/login", authRateLimiter, validate(loginInputSchema), authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/google", authController.googleStart);
authRouter.get("/google/callback", authController.googleCallback);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordInputSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordInputSchema),
  authController.resetPassword,
);
authRouter.post("/verify-email", validate(verifyEmailInputSchema), authController.verifyEmail);
