import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const foodSourceEnum = pgEnum("food_source", ["manual", "off"]);
export type FoodSource = (typeof foodSourceEnum.enumValues)[number];

export const foodItem = pgTable(
  "food_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    brand: text("brand"),
    kcalPer100g: numeric("kcal_per_100g", { precision: 8, scale: 2 }).notNull(),
    proteinPer100g: numeric("protein_per_100g", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    carbsPer100g: numeric("carbs_per_100g", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    fatPer100g: numeric("fat_per_100g", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    source: foodSourceEnum("source").notNull().default("manual"),
    offId: text("off_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("food_item_archived_idx").on(t.archivedAt),
    index("food_item_name_idx").on(t.name),
    uniqueIndex("food_item_off_id_uq")
      .on(t.offId)
      .where(sql`${t.offId} is not null`),
  ],
);

export const meal = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    eatenAt: timestamp("eaten_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("meal_date_idx").on(t.date)],
);

export const mealItem = pgTable(
  "meal_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meal.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foodItem.id, {
      onDelete: "set null",
    }),
    foodNameSnapshot: text("food_name_snapshot").notNull(),
    kcalPer100gSnapshot: numeric("kcal_per_100g_snapshot", {
      precision: 8,
      scale: 2,
    }).notNull(),
    proteinSnapshot: numeric("protein_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    carbsSnapshot: numeric("carbs_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    fatSnapshot: numeric("fat_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    grams: numeric("grams", { precision: 8, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("meal_item_meal_idx").on(t.mealId)],
);

export const mealTemplate = pgTable("meal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const mealTemplateItem = pgTable(
  "meal_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => mealTemplate.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foodItem.id, {
      onDelete: "set null",
    }),
    foodNameSnapshot: text("food_name_snapshot").notNull(),
    kcalPer100gSnapshot: numeric("kcal_per_100g_snapshot", {
      precision: 8,
      scale: 2,
    }).notNull(),
    proteinSnapshot: numeric("protein_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    carbsSnapshot: numeric("carbs_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    fatSnapshot: numeric("fat_snapshot", { precision: 7, scale: 2 })
      .notNull()
      .default("0"),
    grams: numeric("grams", { precision: 8, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("meal_template_item_template_idx").on(t.templateId)],
);

export type FoodItem = typeof foodItem.$inferSelect;
export type NewFoodItem = typeof foodItem.$inferInsert;
export type Meal = typeof meal.$inferSelect;
export type NewMeal = typeof meal.$inferInsert;
export type MealItem = typeof mealItem.$inferSelect;
export type NewMealItem = typeof mealItem.$inferInsert;
export type MealTemplate = typeof mealTemplate.$inferSelect;
export type MealTemplateItem = typeof mealTemplateItem.$inferSelect;
