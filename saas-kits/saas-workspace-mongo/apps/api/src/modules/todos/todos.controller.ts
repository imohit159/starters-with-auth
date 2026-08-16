import type { Request, Response } from "express";
import { createTodo, deleteTodo, listTodos, toggleTodo } from "@repo/services";
import { routeParam } from "../../shared/http";

export async function list(req: Request, res: Response) {
  const todos = await listTodos(req.user!.id, routeParam(req, "organizationId"));
  res.json({ todos });
}

export async function create(req: Request, res: Response) {
  const todo = await createTodo(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
    title: req.body.title,
  });
  res.status(201).json(todo);
}

export async function toggle(req: Request, res: Response) {
  const todo = await toggleTodo(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
    todoId: routeParam(req, "todoId"),
  });
  res.json(todo);
}

export async function remove(req: Request, res: Response) {
  const result = await deleteTodo(req.user!.id, {
    organizationId: routeParam(req, "organizationId"),
    todoId: routeParam(req, "todoId"),
  });
  res.json(result);
}
