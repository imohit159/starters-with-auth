import { Router } from "express";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validateAll } from "../../shared/middleware/validate";
import * as todosController from "./todos.controller";
import { createTodoInputSchema, listTodosInputSchema, todoIdInputSchema } from "./model";

export const todosRouter = Router({ mergeParams: true });

todosRouter.get("/", requireAuth, validateAll(listTodosInputSchema), todosController.list);
todosRouter.post("/", requireAuth, validateAll(createTodoInputSchema), todosController.create);
todosRouter.patch("/:todoId", requireAuth, validateAll(todoIdInputSchema), todosController.toggle);
todosRouter.delete("/:todoId", requireAuth, validateAll(todoIdInputSchema), todosController.remove);
