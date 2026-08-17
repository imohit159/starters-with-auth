import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, ROUTES } from "@/constants/api";
import { parseAllowedOrigins } from "@/lib/origins";

/**
 * Runs before every matched request.
 *
 * Two jobs: answer CORS preflights for the API in one place instead of exporting
 * OPTIONS from a dozen route files, and keep signed-out visitors off the app's
 * private pages. The page guard only checks that a refresh cookie is present —
 * it is a redirect optimisation, never an authorisation decision. Every route
 * handler still verifies the token itself.
 */
const PREFLIGHT_MAX_AGE = "600";

const allowedOrigins = parseAllowedOrigins(
  process.env.APP_URL ?? "http://localhost:3000",
  process.env.ALLOWED_ORIGINS,
);

function preflight(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });
  response.headers.append("vary", "origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return response;
  }
  response.headers.set("access-control-allow-origin", origin);
  response.headers.set("access-control-allow-credentials", "true");
  response.headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  response.headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? "content-type, x-request-id",
  );
  response.headers.set("access-control-max-age", PREFLIGHT_MAX_AGE);
  return response;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return request.method === "OPTIONS" ? preflight(request) : NextResponse.next();
  }

  if (request.cookies.get(COOKIE.refresh)) {
    return NextResponse.next();
  }

  const login = request.nextUrl.clone();
  login.pathname = ROUTES.login;
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/:path*"],
};
