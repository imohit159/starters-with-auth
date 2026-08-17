import { db, eq, users } from "../../database";
import { AppError } from "../../shared/errors/app-error";
import { toUserOutput } from "./model";

export async function getMe(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  return toUserOutput(user);
}
