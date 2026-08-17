import { Todo } from "@repo/database";
import { AppError } from "@repo/logger";
import { isSubscriptionActive, requireMembership } from "../orgs";
import { toTodoOutput, type CreateTodoInputSchema, type TodoIdInputSchema } from "./model";

/**
 * Lists todos for an organization the caller belongs to.
 */
export async function listTodos(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);
  const rows = await Todo.find({ organizationId }).sort({ createdAt: -1 });
  return rows.map(toTodoOutput);
}

/**
 * Creates a todo. Requires org membership and an active subscription.
 */
export async function createTodo(userId: string, input: CreateTodoInputSchema) {
  const { organization } = await requireMembership(userId, input.organizationId);
  if (!isSubscriptionActive(organization.subscriptionStatus, organization.subscriptionEndsAt ?? null)) {
    throw new AppError(402, "SUBSCRIPTION_REQUIRED", "An active subscription is required to create todos");
  }
  const todo = await Todo.create({
    organizationId: organization._id,
    userId,
    title: input.title,
  });
  return toTodoOutput(todo);
}

export async function toggleTodo(userId: string, input: TodoIdInputSchema) {
  await requireMembership(userId, input.organizationId);
  const todo = await Todo.findOne({ _id: input.todoId, organizationId: input.organizationId });
  if (!todo) {
    throw new AppError(404, "NOT_FOUND", "Todo not found");
  }
  todo.completed = !todo.completed;
  await todo.save();
  return toTodoOutput(todo);
}

export async function deleteTodo(userId: string, input: TodoIdInputSchema) {
  await requireMembership(userId, input.organizationId);
  const deleted = await Todo.findOneAndDelete({
    _id: input.todoId,
    organizationId: input.organizationId,
  });
  if (!deleted) {
    throw new AppError(404, "NOT_FOUND", "Todo not found");
  }
  return { message: "Todo deleted" };
}
