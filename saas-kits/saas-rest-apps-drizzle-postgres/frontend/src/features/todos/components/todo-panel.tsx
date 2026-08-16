"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateTodo, useDeleteTodo, useTodos, useToggleTodo } from "@/hooks/use-todos";

export function TodoPanel({
  organizationId,
  isSubscribed,
}: {
  organizationId: string;
  isSubscribed: boolean;
}) {
  const todos = useTodos(organizationId);
  const create = useCreateTodo();
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();
  const [title, setTitle] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos</CardTitle>
        <CardDescription>
          Sample product feature from the video. Create is gated on an active org subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              { organizationId, title },
              {
                onSuccess: () => setTitle(""),
              },
            );
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isSubscribed ? "Add a todo" : "Subscribe to add todos"}
            disabled={!isSubscribed}
          />
          <Button type="submit" disabled={!isSubscribed || create.isPending || title.trim().length === 0}>
            Add
          </Button>
        </form>
        <ul className="grid gap-2">
          {todos.data?.map((todo) => (
            <li key={todo.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <button
                type="button"
                className={todo.completed ? "text-muted-foreground line-through" : "text-left"}
                onClick={() => toggle.mutate({ organizationId, todoId: todo.id })}
              >
                {todo.title}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate({ organizationId, todoId: todo.id })}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
