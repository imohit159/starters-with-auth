import { z } from "zod";
import type { TodoDocument } from "@repo/database";
import { objectIdSchema } from "../orgs/model";

export const listTodosInputSchema = z.object({
  organizationId: objectIdSchema,
});
export type ListTodosInputSchema = z.infer<typeof listTodosInputSchema>;

export const createTodoInputSchema = z.object({
  organizationId: objectIdSchema,
  title: z.string().trim().min(1).max(200),
});
export type CreateTodoInputSchema = z.infer<typeof createTodoInputSchema>;

export const todoIdInputSchema = z.object({
  organizationId: objectIdSchema,
  todoId: objectIdSchema,
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

export function toTodoOutput(todo: TodoDocument): TodoOutputSchema {
  return {
    id: todo._id.toString(),
    organizationId: todo.organizationId.toString(),
    userId: todo.userId.toString(),
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
