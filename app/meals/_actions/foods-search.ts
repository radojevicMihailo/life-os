"use server";

import { and, ilike, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";

export type LibraryFoodHit = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function searchLibraryFoods(
  query: string,
): Promise<ActionResult<LibraryFoodHit[]>> {
  const term = query.trim();
  const where = term
    ? and(isNull(foodItem.archivedAt), ilike(foodItem.name, `%${term}%`))
    : isNull(foodItem.archivedAt);
  const rows = await db
    .select()
    .from(foodItem)
    .where(where)
    .orderBy(sql`length(${foodItem.name})`, foodItem.name)
    .limit(20);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand,
      kcalPer100g: Number(r.kcalPer100g),
      proteinPer100g: Number(r.proteinPer100g),
      carbsPer100g: Number(r.carbsPer100g),
      fatPer100g: Number(r.fatPer100g),
    })),
  };
}
