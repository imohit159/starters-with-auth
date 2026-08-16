import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { SUBSCRIPTION_STATUS } from "../constants";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  SUBSCRIPTION_STATUS.none,
  SUBSCRIPTION_STATUS.incomplete,
  SUBSCRIPTION_STATUS.trialing,
  SUBSCRIPTION_STATUS.active,
  SUBSCRIPTION_STATUS.past_due,
  SUBSCRIPTION_STATUS.canceled,
  SUBSCRIPTION_STATUS.unpaid,
  SUBSCRIPTION_STATUS.paused,
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default(SUBSCRIPTION_STATUS.none),
    subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("organizations_slug_uidx").on(table.slug),
    uniqueIndex("organizations_stripe_customer_uidx").on(table.stripeCustomerId),
    uniqueIndex("organizations_stripe_subscription_uidx").on(table.stripeSubscriptionId),
    index("organizations_subscription_status_idx").on(table.subscriptionStatus),
  ],
);

export type SelectOrganization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
