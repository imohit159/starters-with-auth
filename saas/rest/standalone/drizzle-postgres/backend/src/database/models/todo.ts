import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organization";
import { users } from "./user";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("todos_org_id_idx").on(table.organizationId),
    index("todos_org_created_idx").on(table.organizationId, table.createdAt),
    index("todos_user_id_idx").on(table.userId),
  ],
);

export type SelectTodo = typeof todos.$inferSelect;
export type InsertTodo = typeof todos.$inferInsert;
