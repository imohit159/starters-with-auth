import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { createEnv } from "./env";

const env = createEnv(process.env);

export default defineConfig({
  out: "./drizzle",
  schema: "./schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
