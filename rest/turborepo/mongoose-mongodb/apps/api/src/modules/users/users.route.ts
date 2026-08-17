import { Router } from "express";
import { requireAuth } from "../../shared/middleware/require-auth";
import * as usersController from "./users.controller";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, usersController.me);
