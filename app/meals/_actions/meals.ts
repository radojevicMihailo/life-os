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
import { resolveMealItems } from "@/lib/meals/snapshots";
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
    if (!foods.has(id) || foods.get(id)!.archivedAt) return fail(`Food ${id} not found or archived`);
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
  const result = await db.transaction(async (tx) => {
    // Serialize snapshot reads with edits, and validate item ownership before
    // replacing rows. Stable item IDs keep subsequent edits tied to history.
    const [current] = await tx.select({ id: meal.id, date: meal.date })
      .from(meal).where(eq(meal.id, id)).for("update");
    if (!current) return fail("Meal not found");
    const existing = await tx.select().from(mealItem).where(eq(mealItem.mealId, id));
    const newFoodIds = Array.from(new Set(v.items.flatMap((item) =>
      !item.mealItemId && item.foodId ? [item.foodId] : [],
    )));
    const foodRows = newFoodIds.length
      ? await tx.select().from(foodItem).where(inArray(foodItem.id, newFoodIds))
      : [];
    const resolved = resolveMealItems(id, v.items, existing, new Map(foodRows.map(food => [food.id, food])));
    if (!resolved.ok) return fail(resolved.error);

    await tx.update(meal).set({
      date: v.date,
      name: v.name,
      eatenAt: v.eatenAt ? new Date(v.eatenAt) : null,
      notes: v.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(meal.id, id));
    await tx.delete(mealItem).where(eq(mealItem.mealId, id));
    await tx.insert(mealItem).values(resolved.items);
    return { ok: true, data: current.date } as const;
  });
  if (!result.ok) return result;
  if (result.data !== v.date) revalidateMealRoutes({ date: result.data });
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
