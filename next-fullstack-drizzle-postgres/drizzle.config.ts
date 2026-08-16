import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { env } from "./src/server/db/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
