import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/app-error";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request", result.error.issues);
    }
    if (source !== "query") {
      req[source] = result.data as never;
    }
    next();
  };
}

export function validateMerged(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      ...(req.body && typeof req.body === "object" ? req.body : {}),
      ...(req.query && typeof req.query === "object" ? req.query : {}),
      ...req.params,
    });
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request", result.error.issues);
    }
    req.body = result.data as never;
    next();
  };
}
