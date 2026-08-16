import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { ORG_ROLE } from "../constants";
import { organizations } from "./organization";
import { users } from "./user";

export const orgRoleEnum = pgEnum("org_role", [ORG_ROLE.owner, ORG_ROLE.admin, ORG_ROLE.member]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default(ORG_ROLE.member),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("memberships_org_user_uidx").on(table.organizationId, table.userId),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_org_id_idx").on(table.organizationId),
  ],
);

export type SelectMembership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;
