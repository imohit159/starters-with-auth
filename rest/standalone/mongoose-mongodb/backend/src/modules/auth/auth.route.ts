import { Router } from "express";
import { authRateLimiter } from "../../shared/middleware/rate-limit";
import { validate } from "../../shared/middleware/validate";
import * as authController from "./auth.controller";
import {
  forgotPasswordDto,
  loginDto,
  registerDto,
  resetPasswordDto,
  verifyEmailDto,
} from "./auth.dto";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate(registerDto), authController.register);
authRouter.post("/login", authRateLimiter, validate(loginDto), authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/google", authController.googleStart);
authRouter.get("/google/callback", authController.googleCallback);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordDto),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordDto),
  authController.resetPassword,
);
authRouter.post("/verify-email", validate(verifyEmailDto), authController.verifyEmail);
