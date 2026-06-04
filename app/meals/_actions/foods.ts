"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import {
  createFoodSchema,
  updateFoodSchema,
  type CreateFoodInput,
  type UpdateFoodInput,
} from "@/lib/validation/meals";
import { revalidateMealRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createFood(
  input: CreateFoodInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createFoodSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const v = parsed.data;
  const [row] = await db
    .insert(foodItem)
    .values({
      name: v.name,
      brand: v.brand ?? null,
      kcalPer100g: String(v.kcalPer100g),
      proteinPer100g: String(v.proteinPer100g),
      carbsPer100g: String(v.carbsPer100g),
      fatPer100g: String(v.fatPer100g),
      source: v.source,
      offId: v.offId ?? null,
    })
    .returning({ id: foodItem.id });
  revalidateMealRoutes({ foodId: row.id });
  return { ok: true, data: { id: row.id } };
}

export async function updateFood(input: UpdateFoodInput): Promise<ActionResult> {
  const parsed = updateFoodSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db
    .update(foodItem)
    .set({
      name: patch.name,
      brand: patch.brand ?? null,
      kcalPer100g: String(patch.kcalPer100g),
      proteinPer100g: String(patch.proteinPer100g),
      carbsPer100g: String(patch.carbsPer100g),
      fatPer100g: String(patch.fatPer100g),
      source: patch.source,
      offId: patch.offId ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(foodItem.id, id));
  revalidateMealRoutes({ foodId: id });
  return { ok: true, data: undefined };
}

export async function archiveFood(id: string): Promise<ActionResult> {
  await db
    .update(foodItem)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(foodItem.id, id));
  revalidateMealRoutes({ foodId: id });
  return { ok: true, data: undefined };
}

export async function unarchiveFood(id: string): Promise<ActionResult> {
  await db
    .update(foodItem)
    .set({ archivedAt: null, updatedAt: sql`now()` })
    .where(eq(foodItem.id, id));
  revalidateMealRoutes({ foodId: id });
  return { ok: true, data: undefined };
}
