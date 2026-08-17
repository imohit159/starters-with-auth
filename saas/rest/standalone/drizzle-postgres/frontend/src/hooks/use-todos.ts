"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { createTodo, deleteTodo, listTodos, toggleTodo } from "@/services/todos.service";

export function useTodos(organizationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.todos(organizationId ?? ""),
    queryFn: () => listTodos(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTodo,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todos(variables.organizationId) });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to create todo"));
    },
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleTodo,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todos(variables.organizationId) });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to update todo"));
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todos(variables.organizationId) });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to delete todo"));
    },
  });
}
