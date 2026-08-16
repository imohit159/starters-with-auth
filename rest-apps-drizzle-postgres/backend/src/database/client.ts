import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { logger } from "../shared/logger/logger";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | undefined;
export let db!: Database;

function migrationsFolder() {
  return process.env.MIGRATIONS_FOLDER ?? fileURLToPath(new URL("./drizzle", import.meta.url));
}

/**
 * Opens a postgres.js pool and assigns the shared Drizzle client.
 * Safe to call once per process. Subsequent calls are no-ops until disconnect.
 */
export async function connectDb(url: string) {
  if (client) {
    return;
  }
  client = postgres(url, { max: 10 });
  db = drizzle(client, { schema });
  logger.info("postgres_connected");
}

/**
 * Applies checked-in SQL migrations from `src/database/drizzle`.
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
