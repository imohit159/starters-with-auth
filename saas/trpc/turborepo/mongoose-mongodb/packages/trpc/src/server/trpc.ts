import { initTRPC, TRPCError } from "@trpc/server";
import { env, verifyAccessToken } from "@repo/services";
import { AppError } from "@repo/logger";
import { ZodError } from "zod";
import type { Context } from "./context";
import { COOKIE } from "./http";

function httpStatusToTrpcCode(status: number): TRPCError["code"] {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 402:
      return "FORBIDDEN";
    case 429:
      return "TOO_MANY_REQUESTS";
    case 503:
      return "PRECONDITION_FAILED";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const app = error.cause instanceof AppError ? error.cause : undefined;
    const zod = error.cause instanceof ZodError ? error.cause : undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: app?.code,
        details: app?.details ?? zod?.issues,
      },
    };
  },
});

function unwrapAppError(error: unknown): AppError | undefined {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof TRPCError && error.cause instanceof AppError) {
    return error.cause;
  }
  if (error instanceof Error && error.cause instanceof AppError) {
    return error.cause;
  }
  return undefined;
}

function toTrpcError(app: AppError) {
  return new TRPCError({
    code: httpStatusToTrpcCode(app.statusCode),
    message: app.message,
    cause: app,
  });
}

const mapAppError = t.middleware(async ({ next }) => {
  try {
    const result = await next();
    if (!result.ok) {
      const app = unwrapAppError(result.error);
      if (app) {
        throw toTrpcError(app);
      }
    }
    return result;
  } catch (error) {
    const app = unwrapAppError(error);
    if (app) {
      throw toTrpcError(app);
    }
    throw error;
  }
});

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = env.NODE_ENV === "test" ? 10_000 : 30;
const hits = new Map<string, { count: number; resetAt: number }>();

const rateLimit = t.middleware(({ ctx, path, next }) => {
  const ip = ctx.req.ip ?? "unknown";
  const key = `${ip}:${path}`;
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  current.count += 1;
  if (current.count > LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Try again later.",
    });
  }
  return next();
});

const isAuthed = t.middleware(({ ctx, next }) => {
  const header = ctx.req.header("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? (ctx.req.cookies?.[COOKIE.access] as string | undefined);
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  const payload = verifyAccessToken(token);
  return next({
    ctx: {
      ...ctx,
      user: { id: payload.sub, email: payload.email },
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(mapAppError);
export const rateLimitedProcedure = publicProcedure.use(rateLimit);
export const protectedProcedure = publicProcedure.use(isAuthed);
