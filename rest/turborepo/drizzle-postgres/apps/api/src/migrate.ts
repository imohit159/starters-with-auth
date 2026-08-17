import "./load-env";
import { connectDb, disconnectDb, migrateDb } from "@repo/database";
import { env } from "./config/env";

await connectDb(env.DATABASE_URL);
await migrateDb();
await disconnectDb();
