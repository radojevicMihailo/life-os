import { z } from "zod";

export const foodSourceSchema = z.enum(["manual", "off"]);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const macro = z.number().min(0).max(1000);

export const createFoodSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  brand: z.string().trim().max(200).optional().nullable(),
  kcalPer100g: z.number().min(0).max(10_000),
  proteinPer100g: macro,
  carbsPer100g: macro,
  fatPer100g: macro,
  source: foodSourceSchema,
  offId: z.string().trim().max(100).optional().nullable(),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const updateFoodSchema = createFoodSchema.extend({
  id: z.string().uuid(),
});
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;

const mealItemInput = z.object({
  foodId: z.string().uuid(),
  grams: z.number().positive().max(100_000),
});

export const createMealSchema = z.object({
  date: dateString,
  name: z.string().trim().min(1, "Name required").max(200),
  eatenAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
  items: z.array(mealItemInput).min(1, "Add at least one food"),
});
export type CreateMealInput = z.infer<typeof createMealSchema>;

export const updateMealSchema = createMealSchema.extend({
  id: z.string().uuid(),
});
export type UpdateMealInput = z.infer<typeof updateMealSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  items: z.array(mealItemInput).min(1, "Add at least one food"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().uuid(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

const targetField = z.number().int().min(0).max(100_000).nullable();
export const mealTargetsSchema = z.object({
  kcal: targetField,
  protein: targetField,
  carbs: targetField,
  fat: targetField,
});
export type MealTargetsInput = z.infer<typeof mealTargetsSchema>;
