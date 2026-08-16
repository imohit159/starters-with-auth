import type { CookieOptions, Response } from "express";
import { COOKIE } from "../../config/constants";
import { env } from "../../config/env";

function baseCookieOptions(): CookieOptions {
  const secure = env.NODE_ENV === "production" || env.COOKIE_SAMESITE === "none";
  return {
    httpOnly: true,
    secure,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = baseCookieOptions();
  const refreshMs = env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE.access, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie(COOKIE.refresh, refreshToken, { ...base, maxAge: refreshMs });
}

export function clearAuthCookies(res: Response) {
  const base = baseCookieOptions();
  res.clearCookie(COOKIE.access, base);
  res.clearCookie(COOKIE.refresh, base);
}
