import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { logger } from "@/server/logger";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | undefined;
export let db!: Database;

function migrationsFolder() {
  return process.env.MIGRATIONS_FOLDER ?? join(process.cwd(), "drizzle");
}

/**
 * Opens a postgres.js pool and assigns the shared Drizzle client.
 * Safe to call once per process. Subsequent calls are no-ops until disconnect.
 */
export async function connectDb(url: string) {
  if (client) {
    return;
  }
  client = postgres(url, { max: env.NODE_ENV === "production" ? 1 : 10, prepare: false });
  db = drizzle(client, { schema });
  logger.info("postgres_connected");
}

export async function ensureDb() {
  await connectDb(env.DATABASE_URL);
  return db;
}

/**
 * Applies checked-in SQL migrations from `packages/database/drizzle`.
 * Override the folder with `MIGRATIONS_FOLDER` when running from a bundled image.
 */
export async function migrateDb() {
  if (!db) {
    throw new Error("Database is not connected");
  }
  await migrate(db, { migrationsFolder: migrationsFolder() });
}

export async function disconnectDb() {
  if (!client) {
    return;
  }
  await client.end({ timeout: 5 });
  client = undefined;
}
