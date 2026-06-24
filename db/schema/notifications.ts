import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Dedupe ledger for task reminders. One row per (task, action_at, lead) fired.
// Replaces the old scripts/.notif-state.json so notifications can run from CI
// (GitHub Actions) where local file state does not persist between runs.
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
