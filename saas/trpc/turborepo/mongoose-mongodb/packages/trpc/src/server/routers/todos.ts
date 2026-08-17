import {
  createTodo,
  createTodoInputSchema,
  deleteTodo,
  listTodos,
  listTodosInputSchema,
  todoIdInputSchema,
  todoOutputSchema,
  toggleTodo,
} from "@repo/services";
import { z } from "../schema";
import { protectedProcedure, router } from "../trpc";

export const todosRouter = router({
  list: protectedProcedure
    .input(listTodosInputSchema)
    .output(z.array(todoOutputSchema))
    .query(async ({ ctx, input }) => {
      return listTodos(ctx.user.id, input.organizationId);
    }),

  create: protectedProcedure
    .input(createTodoInputSchema)
    .output(todoOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return createTodo(ctx.user.id, input);
    }),

  toggle: protectedProcedure
    .input(todoIdInputSchema)
    .output(todoOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return toggleTodo(ctx.user.id, input);
    }),

  delete: protectedProcedure
    .input(todoIdInputSchema)
    .output(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteTodo(ctx.user.id, input);
    }),
});
