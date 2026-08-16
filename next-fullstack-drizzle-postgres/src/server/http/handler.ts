import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ensureDb } from "@/server/db";
import { env } from "@/server/env";
import { AppError, logger } from "@/server/logger";

type Handler = (request: NextRequest) => Promise<Response>;

function trustedOrigin(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(env.APP_URL).origin;
}

export function apiHandler(handler: Handler): Handler {
  return async (request) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const startedAt = Date.now();
    try {
      if (!trustedOrigin(request)) throw new AppError(403, "INVALID_ORIGIN", "Invalid request origin");
      await ensureDb();
      const response = await handler(request);
      response.headers.set("x-request-id", requestId);
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
      if (error instanceof AppError && error.code === "RATE_LIMITED") {
        const details = error.details as { retryAfter?: number } | undefined;
        if (details?.retryAfter) response.headers.set("retry-after", String(details.retryAfter));
      }
      return response;
    }
  };
}
