import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "done",
  "paused",
  "canceled",
]);

export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];

export const goalStatusLabel: Record<GoalStatus, string> = {
  active: "Active",
  done: "Done",
  paused: "Paused",
  canceled: "Canceled",
};

export const goal = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    status: goalStatusEnum("status").notNull().default("active"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("goal_status_idx").on(t.status)],
);

export const milestone = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("milestone_goal_id_idx").on(t.goalId)],
);

export type Goal = typeof goal.$inferSelect;
export type NewGoal = typeof goal.$inferInsert;
export type Milestone = typeof milestone.$inferSelect;
export type NewMilestone = typeof milestone.$inferInsert;
