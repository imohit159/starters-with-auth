import { z } from "zod";
import type { SelectTodo } from "../../database";

export const listTodosInputSchema = z.object({
  organizationId: z.string().uuid(),
});
export type ListTodosInputSchema = z.infer<typeof listTodosInputSchema>;

export const createTodoInputSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});
export type CreateTodoInputSchema = z.infer<typeof createTodoInputSchema>;

export const todoIdInputSchema = z.object({
  organizationId: z.string().uuid(),
  todoId: z.string().uuid(),
});
export type TodoIdInputSchema = z.infer<typeof todoIdInputSchema>;

export const todoOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TodoOutputSchema = z.infer<typeof todoOutputSchema>;

export function toTodoOutput(todo: SelectTodo): TodoOutputSchema {
  return {
    id: todo.id,
    organizationId: todo.organizationId,
    userId: todo.userId,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
