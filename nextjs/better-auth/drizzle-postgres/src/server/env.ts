import "server-only";
import { z } from "zod";

const PLACEHOLDER_SECRET = /^change-me/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),
    MAIL_FROM: z.string().default("noreply@localhost"),
    SMTP_HOST: z.string().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && PLACEHOLDER_SECRET.test(value.BETTER_AUTH_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "Replace the placeholder secret before deploying",
      });
    }
    if (value.NODE_ENV === "production" && !value.APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must use HTTPS in production",
      });
    }
  });

export function createEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = createEnv(process.env);
export type AppEnv = ReturnType<typeof createEnv>;
