"use client";

import { toast } from "sonner";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useTodos(organizationId: string | null) {
  return trpc.todos.list.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: Boolean(organizationId) },
  );
}

export function useCreateTodo() {
  const utils = trpc.useUtils();
  return trpc.todos.create.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.todos.list.invalidate({ organizationId: variables.organizationId });
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to create todo"));
    },
  });
}

export function useToggleTodo() {
  const utils = trpc.useUtils();
  return trpc.todos.toggle.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.todos.list.invalidate({ organizationId: variables.organizationId });
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to update todo"));
    },
  });
}

export function useDeleteTodo() {
  const utils = trpc.useUtils();
  return trpc.todos.delete.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.todos.list.invalidate({ organizationId: variables.organizationId });
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to delete todo"));
    },
  });
}
