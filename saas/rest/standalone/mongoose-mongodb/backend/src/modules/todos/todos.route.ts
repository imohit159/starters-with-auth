import { Router } from "express";
import { createTodoInputSchema, todoIdInputSchema } from "./model";
import { requireAuth } from "../../shared/middleware/require-auth";
import { validateMerged } from "../../shared/middleware/validate";
import * as todosController from "./todos.controller";

export const todosRouter = Router({ mergeParams: true });

todosRouter.use(requireAuth);
todosRouter.get("/", todosController.list);
todosRouter.post("/", validateMerged(createTodoInputSchema), todosController.create);
todosRouter.patch("/:todoId", validateMerged(todoIdInputSchema), todosController.toggle);
todosRouter.delete("/:todoId", validateMerged(todoIdInputSchema), todosController.remove);
