import {
  pgTable,
  uuid,
  text,
  smallint,
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

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => project.id, { onDelete: "set null" }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
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
    priority: smallint("priority").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    recurrence: jsonb("recurrence").$type<RecurrenceRule | null>(),
    recurrenceParentId: uuid("recurrence_parent_id").references((): AnyPgColumn => task.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("task_completed_at_idx").on(t.completedAt),
    index("task_due_at_idx").on(t.dueAt),
    index("task_project_id_idx").on(t.projectId),
  ],
);

export const tag = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const taskTag = pgTable(
  "task_tag",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.tagId] }),
    index("task_tag_tag_id_idx").on(t.tagId),
  ],
);

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
export type Project = typeof project.$inferSelect;
export type Tag = typeof tag.$inferSelect;
