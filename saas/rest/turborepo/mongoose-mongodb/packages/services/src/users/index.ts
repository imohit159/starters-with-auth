import { User } from "@repo/database";
import { AppError } from "@repo/logger";
import { toUserOutput } from "./model";

/**
 * Returns the authenticated user by id.
 * Throws 401 when the user no longer exists.
 */
export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  return toUserOutput(user);
}
