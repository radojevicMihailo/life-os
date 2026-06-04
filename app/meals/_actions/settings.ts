"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema/settings";
import {
  mealTargetsSchema,
  type MealTargetsInput,
} from "@/lib/validation/meals";
import { revalidateMealRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function getMealTargets(): Promise<MealTargetsInput> {
  const row = await db
    .select({
      kcal: appSettings.mealDailyKcalTarget,
      protein: appSettings.mealDailyProteinGTarget,
      carbs: appSettings.mealDailyCarbsGTarget,
      fat: appSettings.mealDailyFatGTarget,
    })
    .from(appSettings)
    .limit(1);
  return (
    row[0] ?? { kcal: null, protein: null, carbs: null, fat: null }
  );
}

export async function saveMealTargets(
  input: MealTargetsInput,
): Promise<ActionResult> {
  const parsed = mealTargetsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  await db
    .insert(appSettings)
    .values({
      id: 1,
      mealDailyKcalTarget: v.kcal,
      mealDailyProteinGTarget: v.protein,
      mealDailyCarbsGTarget: v.carbs,
      mealDailyFatGTarget: v.fat,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        mealDailyKcalTarget: v.kcal,
        mealDailyProteinGTarget: v.protein,
        mealDailyCarbsGTarget: v.carbs,
        mealDailyFatGTarget: v.fat,
        updatedAt: sql`now()`,
      },
    });
  revalidateMealRoutes();
  return { ok: true, data: undefined };
}
