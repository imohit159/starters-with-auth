import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { IDENTITY_PROVIDER } from "../constants";
import { users } from "./user";

export const identityProviderEnum = pgEnum("identity_provider", [
  IDENTITY_PROVIDER.password,
  IDENTITY_PROVIDER.google,
]);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: identityProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    passwordHash: text("password_hash"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    profile: jsonb("profile").$type<{ picture?: string; locale?: string } | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_user_uidx").on(table.provider, table.providerUserId),
    index("auth_identities_user_id_idx").on(table.userId),
    index("auth_identities_user_provider_idx").on(table.userId, table.provider),
  ],
);

export type SelectAuthIdentity = typeof authIdentities.$inferSelect;
export type InsertAuthIdentity = typeof authIdentities.$inferInsert;
