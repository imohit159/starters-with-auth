import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ensureDb } from "@/server/db";
import { env } from "@/server/env";
import { AppError, logger } from "@/server/logger";

type Handler = (request: NextRequest) => Promise<Response>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin) && env.ALLOWED_ORIGIN_LIST.includes(origin as string);
}

/**
 * CSRF defence for cookie auth: a state-changing request must declare an Origin
 * this deployment trusts. Browsers set Origin on every cross-site write and
 * cannot be talked out of it, so a forged form post from another site fails here.
 */
function trustedOrigin(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) {
    return true;
  }
  return isAllowedOrigin(request.headers.get("origin"));
}

/**
 * Echoes the caller's origin when it is on the allowlist.
 * Required for a browser to accept a credentialed cross-origin response, and
 * the reason `*` is never used here — wildcards are illegal with credentials.
 */
export function applyCors(response: Response, origin: string | null) {
  response.headers.append("vary", "origin");
  if (!isAllowedOrigin(origin)) {
    return response;
  }
  response.headers.set("access-control-allow-origin", origin);
  response.headers.set("access-control-allow-credentials", "true");
  response.headers.set("access-control-expose-headers", "x-request-id, retry-after, ratelimit-limit, ratelimit-remaining, ratelimit-reset");
  return response;
}

export function apiHandler(handler: Handler): Handler {
  return async (request) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const origin = request.headers.get("origin");
    const startedAt = Date.now();
    try {
      if (!trustedOrigin(request)) {
        throw new AppError(403, "INVALID_ORIGIN", "Invalid request origin");
      }
      await ensureDb();
      const response = await handler(request);
      response.headers.set("x-request-id", requestId);
      applyCors(response, origin);
      logger.info("request_completed", {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : error instanceof ZodError ? 400 : 500;
      const body = error instanceof AppError
        ? { error: { code: error.code, message: error.message, details: error.details } }
        : error instanceof ZodError
          ? { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues } }
          : { error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
      if (status === 500) logger.error("unhandled_error", { requestId, error: error instanceof Error ? error.message : "unknown" });
      const response = NextResponse.json(body, { status });
      response.headers.set("x-request-id", requestId);
      applyCors(response, origin);
      if (error instanceof AppError && error.code === "RATE_LIMITED") {
        const details = error.details as { retryAfter?: number } | undefined;
        if (details?.retryAfter) response.headers.set("retry-after", String(details.retryAfter));
      }
      return response;
    }
  };
}
