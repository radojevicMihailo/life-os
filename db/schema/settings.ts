import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appSettings = pgTable("app_settings", {
  id: smallint("id").primaryKey().default(1),
  googleCalendarIds: text("google_calendar_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type AppSettings = typeof appSettings.$inferSelect;
