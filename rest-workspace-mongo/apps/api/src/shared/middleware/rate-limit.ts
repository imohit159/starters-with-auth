import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler() {
    throw new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.");
  },
});
