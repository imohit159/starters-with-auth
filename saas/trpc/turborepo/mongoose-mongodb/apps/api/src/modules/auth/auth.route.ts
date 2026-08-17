import { Router } from "express";
import * as authController from "./auth.controller";

export const authRouter = Router();

authRouter.get("/google", authController.googleStart);
authRouter.get("/google/callback", authController.googleCallback);
