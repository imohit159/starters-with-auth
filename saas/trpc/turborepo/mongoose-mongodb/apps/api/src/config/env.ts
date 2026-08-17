import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  API_ORIGIN: z.string().url(),
});

export function createEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = createEnv(process.env);
export type HostEnv = z.infer<typeof envSchema>;
