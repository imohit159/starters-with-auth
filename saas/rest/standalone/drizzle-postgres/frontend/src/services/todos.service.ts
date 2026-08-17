import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { Todo } from "@/types/auth";

export async function listTodos(organizationId: string) {
  const { data } = await api.get<{ todos: Todo[] }>(API_PATHS.orgTodos(organizationId));
  return data.todos;
}

export async function createTodo(input: { organizationId: string; title: string }) {
  const { data } = await api.post<{ todo: Todo }>(API_PATHS.orgTodos(input.organizationId), { title: input.title });
  return data.todo;
}

export async function toggleTodo(input: { organizationId: string; todoId: string }) {
  const { data } = await api.patch<{ todo: Todo }>(API_PATHS.orgTodo(input.organizationId, input.todoId));
  return data.todo;
}

export async function deleteTodo(input: { organizationId: string; todoId: string }) {
  const { data } = await api.delete<{ message: string }>(API_PATHS.orgTodo(input.organizationId, input.todoId));
  return data;
}
