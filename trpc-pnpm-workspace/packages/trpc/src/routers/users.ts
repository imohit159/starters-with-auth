import { getMe } from "@repo/users";
import { protectedProcedure, router } from "../trpc";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return getMe(ctx.user.id);
  }),
});
