import { User } from "./user.model";
import { toPublicUser } from "./users.dto";
import { AppError } from "../../shared/errors/app-error";

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }
  return toPublicUser(user);
}
