import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { INVITE_STATUS, ORG_ROLE } from "../constants";
import { organizations } from "./organization";
import { users } from "./user";
import { orgRoleEnum } from "./membership";

export const inviteStatusEnum = pgEnum("invite_status", [
  INVITE_STATUS.pending,
  INVITE_STATUS.accepted,
  INVITE_STATUS.revoked,
]);

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default(ORG_ROLE.member),
    status: inviteStatusEnum("status").notNull().default(INVITE_STATUS.pending),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("organization_invites_token_hash_uidx").on(table.tokenHash),
    index("organization_invites_org_id_idx").on(table.organizationId),
    index("organization_invites_email_idx").on(table.email),
    index("organization_invites_org_email_status_idx").on(table.organizationId, table.email, table.status),
  ],
);

export type SelectOrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganizationInvite = typeof organizationInvites.$inferInsert;
