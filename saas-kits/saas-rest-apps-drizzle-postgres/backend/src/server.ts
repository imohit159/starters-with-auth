import { env } from "./config/env";
import { createApp } from "./app";
import { connectDb } from "./database";
import { logger } from "./shared/logger/logger";

const app = createApp();

await connectDb(env.DATABASE_URL);

app.listen(env.PORT, () => {
  logger.info("api_listening", { port: env.PORT, env: env.NODE_ENV });
});
