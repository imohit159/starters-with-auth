import type { Request } from "express";
import { AppError } from "@repo/logger";

export const COOKIE = {
  access: "access_token",
  refresh: "refresh_token",
} as const;

export function getRequestMeta(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ip: req.ip,
  };
}

export function getRefreshToken(req: Request) {
  const token = req.cookies?.[COOKIE.refresh] as string | undefined;
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token missing");
  }
  return token;
}
