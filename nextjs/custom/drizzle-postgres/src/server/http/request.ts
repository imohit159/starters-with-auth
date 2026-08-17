import type { NextRequest } from "next/server";
import { AppError } from "@/server/logger";
import { verifyAccessToken } from "@/server/modules/auth/crypto";
import { COOKIE } from "./constants";

export function getRequestMeta(request: NextRequest) {
  return {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ?? undefined,
  };
}

export function getRefreshTokenOptional(request: NextRequest) {
  return request.cookies.get(COOKIE.refresh)?.value;
}

export function getRefreshToken(request: NextRequest) {
  const token = getRefreshTokenOptional(request);
  if (!token) throw new AppError(401, "UNAUTHORIZED", "Refresh token missing");
  return token;
}

export function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const token = bearer ?? request.cookies.get(COOKIE.access)?.value;
  if (!token) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  return verifyAccessToken(token);
}
