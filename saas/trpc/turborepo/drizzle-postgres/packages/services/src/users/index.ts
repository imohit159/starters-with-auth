import { eq } from "drizzle-orm";
import { db, users } from "@repo/database";
import { AppError } from "@repo/logger";
import { toUserOutput } from "./model";

/**
 * Returns the authenticated user by id.
 * Throws 401 when the user no longer exists.
 */
export async function getMe(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  return toUserOutput(user);
}
