import { pgTable, text, timestamp, primaryKey, uuid, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Dedupe ledger for task reminders. One row per (task, action_at, lead) fired.
// Persists delivery history across local reminder runs.
export const notifSent = pgTable(
  "notif_sent",
  {
    taskId: text("task_id").notNull(),
    actionAt: timestamp("action_at", { withTimezone: true }).notNull(),
    lead: text("lead").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.actionAt, t.lead] })],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  vapidPublicKey: text("vapid_public_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushDeliveries = pgTable("push_deliveries", {
  subscriptionId: uuid("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  reminderKey: text("reminder_key").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  lead: integer("lead").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => [
  primaryKey({ columns: [t.subscriptionId, t.reminderKey, t.startsAt, t.lead] }),
  index("push_deliveries_starts_at_idx").on(t.startsAt),
]);
