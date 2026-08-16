import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-request-id");
  req.requestId = header && header.trim().length > 0 ? header : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
