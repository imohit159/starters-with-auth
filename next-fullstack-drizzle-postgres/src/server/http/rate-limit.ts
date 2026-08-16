import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { authRateLimits, db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/logger";

const WINDOW_MS = 15 * 60 * 1_000;
const LIMIT = 30;

function hashKey(value: string) {
  return createHmac("sha256", env.RATE_LIMIT_SECRET).update(value).digest("hex");
}

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  enforceInTest?: boolean;
};

export async function enforceAuthRateLimit(
  request: Request,
  bucket: string,
  options: RateLimitOptions = {},
) {
  if (env.NODE_ENV === "test" && !options.enforceInTest) return undefined;

  const windowMs = options.windowMs ?? WINDOW_MS;
  const limit = options.limit ?? LIMIT;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwarded || request.headers.get("x-real-ip") || "unknown";
  const keyHash = hashKey(`${bucket}:${client}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const nowIso = now.toISOString();
  const expiresIso = expiresAt.toISOString();

  const result = await db.execute<{ count: number; expires_at: string }>(sql`
    INSERT INTO ${authRateLimits} (key_hash, count, window_started_at, expires_at, updated_at)
    VALUES (${keyHash}, 1, ${nowIso}::timestamptz, ${expiresIso}::timestamptz, ${nowIso}::timestamptz)
    ON CONFLICT (key_hash) DO UPDATE SET
      count = CASE WHEN auth_rate_limits.expires_at <= ${nowIso}::timestamptz THEN 1 ELSE auth_rate_limits.count + 1 END,
      window_started_at = CASE WHEN auth_rate_limits.expires_at <= ${nowIso}::timestamptz THEN ${nowIso}::timestamptz ELSE auth_rate_limits.window_started_at END,
      expires_at = CASE WHEN auth_rate_limits.expires_at <= ${nowIso}::timestamptz THEN ${expiresIso}::timestamptz ELSE auth_rate_limits.expires_at END,
      updated_at = ${nowIso}::timestamptz
    RETURNING count, expires_at
  `);
  const row = result[0];
  if (row && row.count > limit) {
    throw new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.", {
      retryAfter: Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1_000)),
    });
  }

  // Keep cleanup bounded and off the critical path for most requests.
  if (Math.random() < 0.01) {
    void db.delete(authRateLimits).where(sql`${authRateLimits.expiresAt} < now() - interval '1 day'`);
  }

  return row
    ? { limit, remaining: Math.max(0, limit - row.count), resetAt: new Date(row.expires_at) }
    : undefined;
}

export type RateLimitResult = Awaited<ReturnType<typeof enforceAuthRateLimit>>;

export function setRateLimitHeaders(response: Response, result: RateLimitResult) {
  if (!result) return response;
  response.headers.set("ratelimit-limit", String(result.limit));
  response.headers.set("ratelimit-remaining", String(result.remaining));
  response.headers.set("ratelimit-reset", String(Math.ceil(result.resetAt.getTime() / 1_000)));
  return response;
}
