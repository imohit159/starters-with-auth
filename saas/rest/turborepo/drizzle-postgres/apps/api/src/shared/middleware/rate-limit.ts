import { rateLimit } from "express-rate-limit";
import { AppError } from "@repo/logger";
import { env } from "../../config/env";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler() {
    throw new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.");
  },
});
