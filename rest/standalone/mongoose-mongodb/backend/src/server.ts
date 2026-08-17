import { env } from "./config/env";
import { createApp } from "./app";
import { logger } from "./shared/logger/logger";
import { connectDb } from "./utils/db";

const app = createApp();

await connectDb();

app.listen(env.PORT, () => {
  logger.info("api_listening", { port: env.PORT, env: env.NODE_ENV });
});
