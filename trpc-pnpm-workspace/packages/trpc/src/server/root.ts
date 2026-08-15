import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { router } from "./trpc";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
