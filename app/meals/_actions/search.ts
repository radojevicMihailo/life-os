"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import { fetchOffProduct, searchOff, type NormalizedFood } from "@/lib/meals/off";
import type { LibraryFoodHit } from "./foods-search";
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

function rowToHit(row: typeof foodItem.$inferSelect): LibraryFoodHit {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    kcalPer100g: Number(row.kcalPer100g),
    proteinPer100g: Number(row.proteinPer100g),
    carbsPer100g: Number(row.carbsPer100g),
    fatPer100g: Number(row.fatPer100g),
  };
}

export async function importOffFood(
  offId: string,
): Promise<ActionResult<LibraryFoodHit>> {
  const existing = await db
    .select()
    .from(foodItem)
    .where(eq(foodItem.offId, offId))
    .limit(1);
  if (existing[0]) return { ok: true, data: rowToHit(existing[0]) };

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
    .returning();
  revalidateMealRoutes({ foodId: row.id });
  return { ok: true, data: rowToHit(row) };
}
