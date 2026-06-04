import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const habitKindEnum = pgEnum("habit_kind", ["binary", "count"]);
export const habitCadenceEnum = pgEnum("habit_cadence", [
  "daily",
  "weekly_target",
  "weekdays",
]);

export type HabitKind = (typeof habitKindEnum.enumValues)[number];
export type HabitCadence = (typeof habitCadenceEnum.enumValues)[number];

export const habitKindLabel: Record<HabitKind, string> = {
  binary: "Done / not done",
  count: "Count",
};

export const habitCadenceLabel: Record<HabitCadence, string> = {
  daily: "Every day",
  weekly_target: "Weekly target",
  weekdays: "Specific weekdays",
};

export const habit = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    kind: habitKindEnum("kind").notNull().default("binary"),
    targetCount: integer("target_count").notNull().default(1),
    unit: text("unit"),
    cadence: habitCadenceEnum("cadence").notNull().default("daily"),
    weeklyTarget: integer("weekly_target").notNull().default(0),
    weekdays: integer("weekdays").notNull().default(127),
    startDate: date("start_date", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_DATE`),
    endDate: date("end_date", { mode: "string" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("habit_archived_idx").on(t.archivedAt)],
);

export const habitLog = pgTable(
  "habit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habit.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    unique("habit_log_unique").on(t.habitId, t.date),
    index("habit_log_habit_date_idx").on(t.habitId, t.date),
  ],
);

export type Habit = typeof habit.$inferSelect;
export type NewHabit = typeof habit.$inferInsert;
export type HabitLog = typeof habitLog.$inferSelect;
export type NewHabitLog = typeof habitLog.$inferInsert;
