import type { NextResponse } from "next/server";
import { env } from "@/server/env";
import { COOKIE } from "./constants";

const base = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set(COOKIE.access, accessToken, { ...base, maxAge: 15 * 60 });
  response.cookies.set(COOKIE.refresh, refreshToken, {
    ...base,
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(COOKIE.access, "", { ...base, maxAge: 0 });
  response.cookies.set(COOKIE.refresh, "", { ...base, maxAge: 0 });
}
