"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { foodItem, meal, mealItem } from "@/db/schema/meals";
import {
  createMealSchema,
  updateMealSchema,
  type CreateMealInput,
  type UpdateMealInput,
} from "@/lib/validation/meals";
import { revalidateMealRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function loadFoods(ids: string[]) {
  if (ids.length === 0) return new Map<string, typeof foodItem.$inferSelect>();
  const rows = await db.select().from(foodItem).where(inArray(foodItem.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

export async function createMeal(
  input: CreateMealInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createMealSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const v = parsed.data;
  const foodIds = Array.from(new Set(v.items.map((i) => i.foodId)));
  const foods = await loadFoods(foodIds);
  for (const id of foodIds) {
    if (!foods.has(id)) return fail(`Food ${id} not found`);
  }

  const id = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({
        date: v.date,
        name: v.name,
        eatenAt: v.eatenAt ? new Date(v.eatenAt) : null,
        notes: v.notes ?? null,
      })
      .returning({ id: meal.id });
    await tx.insert(mealItem).values(
      v.items.map((it, idx) => {
        const f = foods.get(it.foodId)!;
        return {
          mealId: m.id,
          foodId: f.id,
          foodNameSnapshot: f.name,
          kcalPer100gSnapshot: f.kcalPer100g,
          proteinSnapshot: f.proteinPer100g,
          carbsSnapshot: f.carbsPer100g,
          fatSnapshot: f.fatPer100g,
          grams: String(it.grams),
          sortOrder: idx,
        };
      }),
    );
    return m.id;
  });

  revalidateMealRoutes({ date: v.date, mealId: id });
  return { ok: true, data: { id } };
}

export async function updateMeal(input: UpdateMealInput): Promise<ActionResult> {
  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...v } = parsed.data;
  const foodIds = Array.from(new Set(v.items.map((i) => i.foodId)));
  const foods = await loadFoods(foodIds);
  for (const fid of foodIds) {
    if (!foods.has(fid)) return fail(`Food ${fid} not found`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(meal)
      .set({
        date: v.date,
        name: v.name,
        eatenAt: v.eatenAt ? new Date(v.eatenAt) : null,
        notes: v.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(meal.id, id));
    await tx.delete(mealItem).where(eq(mealItem.mealId, id));
    await tx.insert(mealItem).values(
      v.items.map((it, idx) => {
        const f = foods.get(it.foodId)!;
        return {
          mealId: id,
          foodId: f.id,
          foodNameSnapshot: f.name,
          kcalPer100gSnapshot: f.kcalPer100g,
          proteinSnapshot: f.proteinPer100g,
          carbsSnapshot: f.carbsPer100g,
          fatSnapshot: f.fatPer100g,
          grams: String(it.grams),
          sortOrder: idx,
        };
      }),
    );
  });

  revalidateMealRoutes({ date: v.date, mealId: id });
  return { ok: true, data: undefined };
}

export async function deleteMeal(
  id: string,
  date: string,
): Promise<ActionResult> {
  await db.delete(meal).where(eq(meal.id, id));
  revalidateMealRoutes({ date, mealId: id });
  return { ok: true, data: undefined };
}
