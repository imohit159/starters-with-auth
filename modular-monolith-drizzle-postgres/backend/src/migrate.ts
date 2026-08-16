import { env } from "./config/env";
import { connectDb, disconnectDb, migrateDb } from "./database";

await connectDb(env.DATABASE_URL);
await migrateDb();
await disconnectDb();
