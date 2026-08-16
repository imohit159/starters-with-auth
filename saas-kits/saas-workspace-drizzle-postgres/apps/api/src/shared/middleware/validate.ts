import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "@repo/logger";

type Source = "body" | "query" | "params";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request", result.error.issues);
    }
    req[source] = result.data as never;
    next();
  };
}

/** Merge params, query, and body so nested REST routes can reuse service schemas. */
export function validateAll(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      ...asRecord(req.body),
      ...asRecord(req.query),
      ...asRecord(req.params),
    });
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request", result.error.issues);
    }
    req.body = result.data as never;
    next();
  };
}
