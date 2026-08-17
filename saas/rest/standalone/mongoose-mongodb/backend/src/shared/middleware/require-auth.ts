import type { Request, Response } from "express";
import { COOKIE } from "../../config/constants";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { verifyAccessToken } from "../../utils/crypto";

export function requireAuth(req: Request, _res: Response, next: () => void) {
  const header = req.header("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? (req.cookies?.[COOKIE.access] as string | undefined);

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, email: payload.email };
  next();
}

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

export function googleConfigured() {
  return env.GOOGLE_CLIENT_ID.length > 0 && env.GOOGLE_CLIENT_SECRET.length > 0;
}
