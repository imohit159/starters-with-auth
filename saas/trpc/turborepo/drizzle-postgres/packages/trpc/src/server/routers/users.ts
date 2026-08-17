import { getMe, userOutputSchema } from "@repo/services";
import { protectedProcedure, router } from "../trpc";

export const usersRouter = router({
  me: protectedProcedure.output(userOutputSchema).query(async ({ ctx }) => {
    return getMe(ctx.user.id);
  }),
});
