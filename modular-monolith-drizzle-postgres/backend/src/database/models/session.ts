import {
  type AnyPgColumn,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { SESSION_REVOKE_REASON } from "../constants";
import { users } from "./user";

export const sessionRevokeReasonEnum = pgEnum("session_revoke_reason", [
  SESSION_REVOKE_REASON.logout,
  SESSION_REVOKE_REASON.rotated,
  SESSION_REVOKE_REASON.reuseDetected,
  SESSION_REVOKE_REASON.passwordChanged,
  SESSION_REVOKE_REASON.userDisabled,
]);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: sessionRevokeReasonEnum("revoked_reason"),
    replacedBySessionId: uuid("replaced_by_session_id").references((): AnyPgColumn => sessions.id, {
      onDelete: "set null",
    }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uidx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_family_id_idx").on(table.familyId),
    index("sessions_user_revoked_idx").on(table.userId, table.revokedAt),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export type SelectSession = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
