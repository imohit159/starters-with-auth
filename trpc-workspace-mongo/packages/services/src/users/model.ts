import { z } from "zod";
import { USER_STATUS, type UserDocument } from "@repo/database";

export const userOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  status: z.enum([USER_STATUS.active, USER_STATUS.disabled, USER_STATUS.pendingVerification]),
  emailVerifiedAt: z.string().nullable(),
  roles: z.array(z.string()),
});
export type UserOutputSchema = z.infer<typeof userOutputSchema>;

/**
 * Maps a user document to the API output contract.
 * Omits credentials and persistence identifiers beyond the public id.
 */
export function toUserOutput(user: UserDocument): UserOutputSchema {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    roles: user.roles,
  };
}
