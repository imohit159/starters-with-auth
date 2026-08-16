import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
});

export function createEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = createEnv(process.env);
export type DatabaseEnv = z.infer<typeof envSchema>;
