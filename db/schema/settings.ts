import { integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appSettings = pgTable("app_settings", {
  id: smallint("id").primaryKey().default(1),
  googleCalendarIds: text("google_calendar_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  mealDailyKcalTarget: integer("meal_daily_kcal_target"),
  mealDailyProteinGTarget: integer("meal_daily_protein_g_target"),
  mealDailyCarbsGTarget: integer("meal_daily_carbs_g_target"),
  mealDailyFatGTarget: integer("meal_daily_fat_g_target"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type AppSettings = typeof appSettings.$inferSelect;
