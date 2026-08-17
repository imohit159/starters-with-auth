import "server-only";
import { z } from "zod";
import { parseAllowedOrigins } from "@/lib/origins";

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;
const UNIT_SECONDS = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 } as const;

/**
 * Converts a `jsonwebtoken` style duration ("15m", "2h", "7d") to seconds.
 * Returns null for anything this app is unwilling to guess at.
 */
export function durationToSeconds(value: string) {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
}

const PLACEHOLDER_SECRET = /^change-me/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url(),
    NEXT_PUBLIC_API_URL: z.string().min(1).default("/api/v1"),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    RATE_LIMIT_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRES_IN: z
      .string()
      .default("15m")
      .refine((value) => durationToSeconds(value) !== null, {
        message: "Use a duration like 15m, 2h, or 7d",
      }),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
    REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    COOKIE_DOMAIN: z.string().default(""),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    ALLOWED_ORIGINS: z.string().default(""),
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),
    GOOGLE_REDIRECT_URI: z.string().default(""),
    MAIL_FROM: z.string().default("noreply@localhost"),
    SMTP_HOST: z.string().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.ACCESS_TOKEN_SECRET === value.RATE_LIMIT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["RATE_LIMIT_SECRET"],
        message: "ACCESS_TOKEN_SECRET and RATE_LIMIT_SECRET must be independent values",
      });
    }

    if (value.NODE_ENV !== "production") {
      return;
    }

    for (const key of ["ACCESS_TOKEN_SECRET", "RATE_LIMIT_SECRET"] as const) {
      if (PLACEHOLDER_SECRET.test(value[key])) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Replace the placeholder secret before deploying (openssl rand -hex 32)",
        });
      }
    }

    if (!value.APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must be https in production so auth cookies can be marked secure",
      });
    }

    if (value.COOKIE_SAME_SITE === "none" && !value.COOKIE_DOMAIN) {
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_DOMAIN"],
        message: "COOKIE_SAME_SITE=none needs an explicit COOKIE_DOMAIN",
      });
    }
  })
  .transform((value) => ({
    ...value,
    ACCESS_TOKEN_TTL_SECONDS: durationToSeconds(value.ACCESS_TOKEN_EXPIRES_IN) as number,
    ALLOWED_ORIGIN_LIST: parseAllowedOrigins(value.APP_URL, value.ALLOWED_ORIGINS),
  }));

export function createEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = createEnv(process.env);
export type AuthEnv = ReturnType<typeof createEnv>;
