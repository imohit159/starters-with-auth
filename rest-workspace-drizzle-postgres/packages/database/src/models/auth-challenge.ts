import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { CHALLENGE_TYPE } from "../constants";
import { users } from "./user";

export const challengeTypeEnum = pgEnum("challenge_type", [
  CHALLENGE_TYPE.emailVerification,
  CHALLENGE_TYPE.passwordReset,
  CHALLENGE_TYPE.oauthState,
]);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: challengeTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("auth_challenges_token_hash_uidx").on(table.tokenHash),
    index("auth_challenges_user_id_idx").on(table.userId),
    index("auth_challenges_user_type_idx").on(table.userId, table.type),
    index("auth_challenges_expires_at_idx").on(table.expiresAt),
  ],
);

export type SelectAuthChallenge = typeof authChallenges.$inferSelect;
export type InsertAuthChallenge = typeof authChallenges.$inferInsert;
