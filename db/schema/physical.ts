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
  category_ref: "Category reference",
  exercise_ref: "Exercise reference",
};

export type SetEntry = { weight: number; reps: number };

export type FieldConfig = {
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
} | null;

export const modality = pgTable(
  "modalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("modality_sort_idx").on(t.sortOrder)],
);

export const physicalField = pgTable(
  "physical_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
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
  (t) => [
    uniqueIndex("physical_field_unique_idx").on(t.modalityId, t.scope, t.key),
    index("physical_field_modality_idx").on(t.modalityId),
  ],
);

export const category = pgTable(
  "physical_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("category_modality_name_idx").on(t.modalityId, t.name),
    index("category_modality_idx").on(t.modalityId),
  ],
);

export const exercise = pgTable(
  "physical_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("exercise_modality_name_idx").on(t.modalityId, t.name),
    index("exercise_modality_idx").on(t.modalityId),
    index("exercise_category_idx").on(t.categoryId),
  ],
);

export const activity = pgTable(
  "physical_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "restrict" }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("activity_modality_idx").on(t.modalityId),
    index("activity_performed_at_idx").on(t.performedAt),
  ],
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

export const plan = pgTable(
  "physical_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("plan_modality_idx").on(t.modalityId)],
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

export type Modality = typeof modality.$inferSelect;
export type PhysicalField = typeof physicalField.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type ActivitySubrow = typeof activitySubrow.$inferSelect;
export type Plan = typeof plan.$inferSelect;
export type PlanSubrow = typeof planSubrow.$inferSelect;
