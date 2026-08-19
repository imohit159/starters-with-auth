import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 1 : 10,
  prepare: false,
});

export const db = drizzle(client, { schema });
