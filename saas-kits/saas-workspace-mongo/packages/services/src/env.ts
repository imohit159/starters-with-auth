import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  WEB_ORIGIN: z.string().url(),
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default(""),
  MAIL_FROM: z.string().default("noreply@localhost"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_ID: z.string().default(""),
  STRIPE_SUCCESS_URL: z.string().default("http://localhost:3000/dashboard/billing?status=success"),
  STRIPE_CANCEL_URL: z.string().default("http://localhost:3000/dashboard/billing?status=canceled"),
});

export function createEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = createEnv(process.env);
export type AuthEnv = z.infer<typeof envSchema>;
