import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { USER_STATUS } from "../constants";

export const userStatusEnum = pgEnum("user_status", [
  USER_STATUS.active,
  USER_STATUS.disabled,
  USER_STATUS.pendingVerification,
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    status: userStatusEnum("status").notNull().default(USER_STATUS.active),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`ARRAY['user']::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_email_uidx").on(table.email),
    index("users_status_idx").on(table.status),
  ],
);

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
