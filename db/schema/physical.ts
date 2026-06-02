import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const fieldScopeEnum = pgEnum("physical_field_scope", ["top", "subrow"]);
export type FieldScope = (typeof fieldScopeEnum.enumValues)[number];

export const fieldKindEnum = pgEnum("physical_field_kind", [
  "text",
  "number",
  "decimal",
  "duration_sec",
  "distance_km",
  "sets_array",
  "category_ref",
  "exercise_ref",
]);
export type FieldKind = (typeof fieldKindEnum.enumValues)[number];

export const fieldKindLabel: Record<FieldKind, string> = {
  text: "Text",
  number: "Whole number",
  decimal: "Decimal",
  duration_sec: "Duration (mm:ss)",
  distance_km: "Distance (km)",
  sets_array: "Sets (weight × reps)",
  category_ref: "Group reference",
  exercise_ref: "Exercise reference",
};

export type SetEntry = { weight: number; reps: number };

export type FieldConfig = {
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
} | null;

export const activityTagGroup = pgTable(
  "activity_tag_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
);

export const activityTag = pgTable(
  "activity_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => activityTagGroup.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("activity_tag_group_name_idx").on(t.groupId, t.name),
    index("activity_tag_group_idx").on(t.groupId),
  ],
);

export const physicalField = pgTable(
  "physical_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: fieldScopeEnum("scope").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    kind: fieldKindEnum("kind").notNull(),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<FieldConfig>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("physical_field_scope_key_idx").on(t.scope, t.key)],
);

export const exerciseGroup = pgTable(
  "exercise_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("exercise_group_name_idx").on(t.name)],
);

export const exercise = pgTable(
  "physical_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").references(() => exerciseGroup.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("exercise_name_idx").on(t.name),
    index("exercise_group_idx").on(t.groupId),
  ],
);

export const activity = pgTable(
  "physical_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("activity_performed_at_idx").on(t.performedAt)],
);

export const activitySubrow = pgTable(
  "physical_activity_subrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references((): AnyPgColumn => exercise.id, {
      onDelete: "restrict",
    }),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("activity_subrow_activity_idx").on(t.activityId)],
);

export const physicalActivityTag = pgTable(
  "physical_activity_tags",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => activityTag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.activityId, t.tagId] }),
    index("physical_activity_tag_tag_idx").on(t.tagId),
  ],
);

export const plan = pgTable(
  "physical_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
);

export const planSubrow = pgTable(
  "physical_plan_subrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references((): AnyPgColumn => exercise.id, {
      onDelete: "restrict",
    }),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("plan_subrow_plan_idx").on(t.planId)],
);

export const physicalPlanTag = pgTable(
  "physical_plan_tags",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => activityTag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.tagId] }),
    index("physical_plan_tag_tag_idx").on(t.tagId),
  ],
);

export type ActivityTagGroup = typeof activityTagGroup.$inferSelect;
export type ActivityTag = typeof activityTag.$inferSelect;
export type PhysicalField = typeof physicalField.$inferSelect;
export type ExerciseGroup = typeof exerciseGroup.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type ActivitySubrow = typeof activitySubrow.$inferSelect;
export type Plan = typeof plan.$inferSelect;
export type PlanSubrow = typeof planSubrow.$inferSelect;
