import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { billingRouter } from "./routers/billing";
import { orgsRouter } from "./routers/orgs";
import { todosRouter } from "./routers/todos";
import { usersRouter } from "./routers/users";
import { router } from "./trpc";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  orgs: orgsRouter,
  billing: billingRouter,
  todos: todosRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
