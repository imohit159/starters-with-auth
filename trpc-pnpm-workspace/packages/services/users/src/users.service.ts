import { User } from "@repo/database";
import { AppError } from "@repo/logger";
import { toPublicUser } from "./users.dto";

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  return toPublicUser(user);
}
