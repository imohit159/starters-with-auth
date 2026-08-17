import "./load-env";
import { connectDb } from "@repo/database";
import { logger } from "@repo/logger";
import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

await connectDb(env.DATABASE_URL);

app.listen(env.PORT, () => {
  logger.info("api_listening", { port: env.PORT, env: env.NODE_ENV });
});
