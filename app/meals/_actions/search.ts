"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import { fetchOffProduct, searchOff, type NormalizedFood } from "@/lib/meals/off";
import { revalidateMealRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function searchOffFoods(
  query: string,
): Promise<ActionResult<NormalizedFood[]>> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };
  try {
    return { ok: true, data: await searchOff(q, 10) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Search failed" };
  }
}

export async function importOffFood(
  offId: string,
): Promise<ActionResult<{ id: string }>> {
  const existing = await db
    .select({ id: foodItem.id })
    .from(foodItem)
    .where(eq(foodItem.offId, offId))
    .limit(1);
  if (existing[0]) return { ok: true, data: { id: existing[0].id } };

  let product;
  try {
    product = await fetchOffProduct(offId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fetch failed" };
  }
  if (!product) return { ok: false, error: "Product not found on OpenFoodFacts" };

  const [row] = await db
    .insert(foodItem)
    .values({
      name: product.name,
      brand: product.brand,
      kcalPer100g: String(product.kcalPer100g),
      proteinPer100g: String(product.proteinPer100g),
      carbsPer100g: String(product.carbsPer100g),
      fatPer100g: String(product.fatPer100g),
      source: "off",
      offId: product.offId,
    })
    .returning({ id: foodItem.id });
  revalidateMealRoutes({ foodId: row.id });
  return { ok: true, data: { id: row.id } };
}
