import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { Todo } from "@/types/auth";

export async function listTodos(organizationId: string) {
  const { data } = await api.get<{ todos: Todo[] }>(`${API_PATHS.orgs}/${organizationId}/todos`);
  return data.todos;
}

export async function createTodo(input: { organizationId: string; title: string }) {
  const { data } = await api.post<Todo>(`${API_PATHS.orgs}/${input.organizationId}/todos`, {
    title: input.title,
  });
  return data;
}

export async function toggleTodo(input: { organizationId: string; todoId: string }) {
  const { data } = await api.patch<Todo>(
    `${API_PATHS.orgs}/${input.organizationId}/todos/${input.todoId}`,
  );
  return data;
}

export async function deleteTodo(input: { organizationId: string; todoId: string }) {
  const { data } = await api.delete<{ message: string }>(
    `${API_PATHS.orgs}/${input.organizationId}/todos/${input.todoId}`,
  );
  return data;
}
