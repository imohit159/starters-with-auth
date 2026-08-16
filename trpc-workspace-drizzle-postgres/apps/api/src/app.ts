/// <reference path="./types/express.d.ts" />
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { logger } from "@repo/logger";
import { env } from "./config/env";
import { appRouter, createContext } from "@repo/trpc/server";
import { authRouter } from "./modules/auth/auth.route";
import { errorHandler } from "./shared/middleware/error-handler";
import { requestId } from "./shared/middleware/request-id";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestId);
  app.use((req, _res, next) => {
    logger.info("request", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  app.use("/api/v1/auth", authRouter);

  app.use(errorHandler);
  return app;
}
