import { and, desc, eq } from "drizzle-orm";
import { db, todos } from "../../database";
import { AppError } from "../../shared/errors/app-error";
import { isSubscriptionActive, requireMembership } from "../orgs/orgs.service";
import { toTodoOutput, type CreateTodoInputSchema, type TodoIdInputSchema } from "./model";

/**
 * Lists todos for an organization the caller belongs to.
 */
export async function listTodos(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);
  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.organizationId, organizationId))
    .orderBy(desc(todos.createdAt));
  return rows.map(toTodoOutput);
}

/**
 * Creates a todo. Requires org membership and an active subscription.
 */
export async function createTodo(userId: string, input: CreateTodoInputSchema) {
  const { organization } = await requireMembership(userId, input.organizationId);
  if (!isSubscriptionActive(organization.subscriptionStatus, organization.subscriptionEndsAt)) {
    throw new AppError(402, "SUBSCRIPTION_REQUIRED", "An active subscription is required to create todos");
  }
  const [todo] = await db
    .insert(todos)
    .values({
      organizationId: organization.id,
      userId,
      title: input.title,
    })
    .returning();
  return toTodoOutput(todo);
}

export async function toggleTodo(userId: string, input: TodoIdInputSchema) {
  await requireMembership(userId, input.organizationId);
  const [todo] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, input.todoId), eq(todos.organizationId, input.organizationId)))
    .limit(1);
  if (!todo) {
    throw new AppError(404, "NOT_FOUND", "Todo not found");
  }
  const [updated] = await db
    .update(todos)
    .set({ completed: !todo.completed })
    .where(eq(todos.id, todo.id))
    .returning();
  return toTodoOutput(updated);
}

export async function deleteTodo(userId: string, input: TodoIdInputSchema) {
  await requireMembership(userId, input.organizationId);
  const deleted = await db
    .delete(todos)
    .where(and(eq(todos.id, input.todoId), eq(todos.organizationId, input.organizationId)))
    .returning({ id: todos.id });
  if (deleted.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Todo not found");
  }
  return { message: "Todo deleted" };
}
