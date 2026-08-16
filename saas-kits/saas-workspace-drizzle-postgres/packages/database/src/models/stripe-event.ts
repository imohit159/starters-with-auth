import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").$type<Record<string, unknown> | null>(),
});

export type SelectStripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = typeof stripeEvents.$inferInsert;
