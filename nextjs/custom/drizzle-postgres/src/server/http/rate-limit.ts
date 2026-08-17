import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { authRateLimits, db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/logger";

const WINDOW_MS = 15 * 60 * 1_000;
const DEFAULT_IP_LIMIT = 30;

/**
 * Per-endpoint budgets inside one 15 minute window.
 * `ip` blunts spray from a single host; `subject` caps attempts against one
 * account no matter how many hosts they come from. Buckets without a `subject`
 * entry have no account-scoped identifier worth counting.
 */
const BUCKET_LIMITS: Record<string, { ip: number; subject?: number }> = {
  login: { ip: 20, subject: 8 },
  register: { ip: 10, subject: 3 },
  refresh: { ip: 60 },
  logout: { ip: 60 },
  "forgot-password": { ip: 10, subject: 3 },
  "reset-password": { ip: 10, subject: 5 },
  "verify-email": { ip: 20 },
  "change-password": { ip: 10, subject: 5 },
  "google-start": { ip: 20 },
  "google-callback": { ip: 20 },
};

function hashKey(value: string) {
  return createHmac("sha256", env.RATE_LIMIT_SECRET).update(value).digest("hex");
}

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export type RateLimitResult =
  | { limit: number; remaining: number; resetAt: Date }
  | undefined;

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  enforceInTest?: boolean;
};

/**
 * Atomically increments one counter and throws 429 once it passes the limit.
 * A single upsert does the read, the window roll, and the write, so concurrent
 * requests cannot each see a stale count.
 */
async function consume(keyHash: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + windowMs).toISOString();

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
  if (!row) {
    return undefined;
  }

  const resetAt = new Date(row.expires_at);
  if (row.count > limit) {
    throw new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.", {
      retryAfter: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1_000)),
    });
  }

  // Keep cleanup bounded and off the critical path for most requests.
  if (Math.random() < 0.01) {
    void db.delete(authRateLimits).where(sql`${authRateLimits.expiresAt} < now() - interval '1 day'`);
  }

  return { limit, remaining: Math.max(0, limit - row.count), resetAt };
}

/** Counts a request against the caller's IP for the given bucket. */
export async function enforceAuthRateLimit(
  request: Request,
  bucket: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  if (env.NODE_ENV === "test" && !options.enforceInTest) {
    return undefined;
  }
  const limit = options.limit ?? BUCKET_LIMITS[bucket]?.ip ?? DEFAULT_IP_LIMIT;
  return consume(
    hashKey(`ip:${bucket}:${clientAddress(request)}`),
    limit,
    options.windowMs ?? WINDOW_MS,
  );
}

/**
 * Counts a request against the account it targets, independent of source IP.
 * Call this after input validation, once the email is known.
 */
export async function enforceSubjectRateLimit(
  subject: string,
  bucket: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  if (env.NODE_ENV === "test" && !options.enforceInTest) {
    return undefined;
  }
  const limit = options.limit ?? BUCKET_LIMITS[bucket]?.subject;
  if (!limit) {
    return undefined;
  }
  return consume(
    hashKey(`subject:${bucket}:${subject.toLowerCase()}`),
    limit,
    options.windowMs ?? WINDOW_MS,
  );
}

/** Reports whichever budget is closest to exhaustion. */
export function tightestLimit(...results: RateLimitResult[]): RateLimitResult {
  return results
    .filter((result): result is NonNullable<RateLimitResult> => Boolean(result))
    .sort((left, right) => left.remaining - right.remaining)[0];
}

export function setRateLimitHeaders(response: Response, result: RateLimitResult) {
  if (!result) {
    return response;
  }
  response.headers.set("ratelimit-limit", String(result.limit));
  response.headers.set("ratelimit-remaining", String(result.remaining));
  response.headers.set("ratelimit-reset", String(Math.ceil(result.resetAt.getTime() / 1_000)));
  return response;
}
