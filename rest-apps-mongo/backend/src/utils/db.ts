import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

export async function connectDb(uri = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logger.info("mongo_connected");
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
