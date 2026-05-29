import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type RecurrenceRule = {
  freq: "daily" | "weekly" | "monthly";
  interval: number;
  byweekday?: number[];
};

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "in_progress",
  "waiting_for",
  "canceled",
  "done",
]);

export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];

export const taskStatusLabel: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  waiting_for: "Waiting for",
  canceled: "Canceled",
  done: "Done",
};

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "canceled",
]);

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];

export const projectStatusLabel: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  canceled: "Canceled",
};

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => project.id, { onDelete: "set null" }),
  status: projectStatusEnum("status").notNull().default("active"),
  startAt: timestamp("start_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const priority = pgTable("priority", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color"),
  rank: integer("rank").notNull().default(1000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const task = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    notes: text("notes"),
    projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => task.id, {
      onDelete: "cascade",
    }),
    status: taskStatusEnum("status").notNull().default("backlog"),
    priorityId: uuid("priority_id").references(() => priority.id, { onDelete: "set null" }),
    actionAt: timestamp("action_at", { withTimezone: true }),
    actionEndAt: timestamp("action_end_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    recurrence: jsonb("recurrence").$type<RecurrenceRule | null>(),
    recurrenceParentId: uuid("recurrence_parent_id").references((): AnyPgColumn => task.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("task_status_idx").on(t.status),
    index("task_due_at_idx").on(t.dueAt),
    index("task_action_at_idx").on(t.actionAt),
    index("task_project_id_idx").on(t.projectId),
    index("task_priority_id_idx").on(t.priorityId),
  ],
);

export const context = pgTable("context", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const taskContext = pgTable(
  "task_context",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    contextId: uuid("context_id")
      .notNull()
      .references(() => context.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.contextId] }),
    index("task_context_context_id_idx").on(t.contextId),
  ],
);

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
export type Project = typeof project.$inferSelect;
export type Priority = typeof priority.$inferSelect;
export type Context = typeof context.$inferSelect;
