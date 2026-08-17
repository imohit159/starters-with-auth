import type { NextResponse } from "next/server";
import { env } from "@/server/env";
import { COOKIE } from "./constants";

/**
 * Cookie flags shared by both auth cookies.
 * `secure` is forced on whenever SameSite=None, because browsers reject the pair otherwise.
 * `domain` stays unset for same-origin deployments so the cookie is host-only.
 */
function baseOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" || env.COOKIE_SAME_SITE === "none",
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  } as const;
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const base = baseOptions();
  response.cookies.set(COOKIE.access, accessToken, {
    ...base,
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
  });
  response.cookies.set(COOKIE.refresh, refreshToken, {
    ...base,
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const base = baseOptions();
  response.cookies.set(COOKIE.access, "", { ...base, maxAge: 0 });
  response.cookies.set(COOKIE.refresh, "", { ...base, maxAge: 0 });
}
