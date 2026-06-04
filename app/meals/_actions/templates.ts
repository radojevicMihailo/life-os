"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  foodItem,
  meal,
  mealItem,
  mealTemplate,
  mealTemplateItem,
} from "@/db/schema/meals";
import {
  createTemplateSchema,
  updateTemplateSchema,
  type CreateTemplateInput,
  type UpdateTemplateInput,
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

export async function createTemplate(
  input: CreateTemplateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const v = parsed.data;
  const foodIds = Array.from(new Set(v.items.map((i) => i.foodId)));
  const foods = await loadFoods(foodIds);
  for (const fid of foodIds) {
    if (!foods.has(fid)) return fail(`Food ${fid} not found`);
  }

  const id = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(mealTemplate)
      .values({ name: v.name })
      .returning({ id: mealTemplate.id });
    await tx.insert(mealTemplateItem).values(
      v.items.map((it, idx) => {
        const f = foods.get(it.foodId)!;
        return {
          templateId: t.id,
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
    return t.id;
  });

  revalidateMealRoutes({ templateId: id });
  return { ok: true, data: { id } };
}

export async function updateTemplate(
  input: UpdateTemplateInput,
): Promise<ActionResult> {
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...v } = parsed.data;
  const foodIds = Array.from(new Set(v.items.map((i) => i.foodId)));
  const foods = await loadFoods(foodIds);
  for (const fid of foodIds) {
    if (!foods.has(fid)) return fail(`Food ${fid} not found`);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(mealTemplate)
      .set({ name: v.name, updatedAt: new Date() })
      .where(eq(mealTemplate.id, id));
    await tx.delete(mealTemplateItem).where(eq(mealTemplateItem.templateId, id));
    await tx.insert(mealTemplateItem).values(
      v.items.map((it, idx) => {
        const f = foods.get(it.foodId)!;
        return {
          templateId: id,
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
  revalidateMealRoutes({ templateId: id });
  return { ok: true, data: undefined };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  await db.delete(mealTemplate).where(eq(mealTemplate.id, id));
  revalidateMealRoutes({ templateId: id });
  return { ok: true, data: undefined };
}

export async function applyTemplateToDay(
  templateId: string,
  date: string,
): Promise<ActionResult<{ mealId: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Invalid date");
  const t = await db
    .select()
    .from(mealTemplate)
    .where(eq(mealTemplate.id, templateId))
    .limit(1);
  if (!t[0]) return fail("Template not found");
  const items = await db
    .select()
    .from(mealTemplateItem)
    .where(eq(mealTemplateItem.templateId, templateId));
  if (items.length === 0) return fail("Template has no items");

  const mealId = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({ date, name: t[0].name })
      .returning({ id: meal.id });
    await tx.insert(mealItem).values(
      items.map((it) => ({
        mealId: m.id,
        foodId: it.foodId,
        foodNameSnapshot: it.foodNameSnapshot,
        kcalPer100gSnapshot: it.kcalPer100gSnapshot,
        proteinSnapshot: it.proteinSnapshot,
        carbsSnapshot: it.carbsSnapshot,
        fatSnapshot: it.fatSnapshot,
        grams: it.grams,
        sortOrder: it.sortOrder,
      })),
    );
    return m.id;
  });

  revalidateMealRoutes({ date, mealId });
  return { ok: true, data: { mealId } };
}
