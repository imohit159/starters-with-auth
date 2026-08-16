import mongoose from "mongoose";
import { logger } from "@repo/logger";

export async function connectDb(uri: string) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logger.info("mongo_connected");
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
