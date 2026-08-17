import type { Request, Response } from "express";
import * as todosService from "./todos.service";
import type { CreateTodoInputSchema, ListTodosInputSchema, TodoIdInputSchema } from "./model";

export async function list(req: Request, res: Response) {
  const input = req.body as ListTodosInputSchema;
  const todos = await todosService.listTodos(req.user!.id, input.organizationId);
  res.json({ todos });
}

export async function create(req: Request, res: Response) {
  const todo = await todosService.createTodo(req.user!.id, req.body as CreateTodoInputSchema);
  res.status(201).json({ todo });
}

export async function toggle(req: Request, res: Response) {
  const todo = await todosService.toggleTodo(req.user!.id, req.body as TodoIdInputSchema);
  res.json({ todo });
}

export async function remove(req: Request, res: Response) {
  const result = await todosService.deleteTodo(req.user!.id, req.body as TodoIdInputSchema);
  res.json(result);
}
