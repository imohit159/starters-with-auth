import type { Request, Response } from "express";
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
  type CreateTodoInputSchema,
  type ListTodosInputSchema,
  type TodoIdInputSchema,
} from "@repo/services";

export async function list(req: Request, res: Response) {
  const input = req.body as ListTodosInputSchema;
  const todos = await listTodos(req.user!.id, input.organizationId);
  res.json({ todos });
}

export async function create(req: Request, res: Response) {
  const todo = await createTodo(req.user!.id, req.body as CreateTodoInputSchema);
  res.status(201).json({ todo });
}

export async function toggle(req: Request, res: Response) {
  const todo = await toggleTodo(req.user!.id, req.body as TodoIdInputSchema);
  res.json({ todo });
}

export async function remove(req: Request, res: Response) {
  const result = await deleteTodo(req.user!.id, req.body as TodoIdInputSchema);
  res.json(result);
}
