import { createTRPCReact } from "@trpc/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@repo/trpc";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof TRPCClientError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
