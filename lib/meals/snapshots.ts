import type { FoodItem, MealItem, NewMealItem } from "@/db/schema/meals";
import type { UpdateMealInput } from "@/lib/validation/meals";

/** Existing history comes only from server-owned rows; new items use the library. */
export function resolveMealItems(
  mealId: string,
  items: UpdateMealInput["items"],
  existingItems: MealItem[],
  foods: Map<string, FoodItem>,
): { ok: true; items: NewMealItem[] } | { ok: false; error: string } {
  const existing = new Map(existingItems.map(item => [item.id, item]));
  const used = new Set<string>();
  const resolved: NewMealItem[] = [];
  for (const [sortOrder, item] of items.entries()) {
    if (item.mealItemId) {
      const previous = existing.get(item.mealItemId);
      if (!previous || previous.mealId !== mealId || previous.foodId !== item.foodId || used.has(previous.id)) {
        return { ok: false, error: "Meal item no longer matches this meal. Reload and try again." };
      }
      used.add(previous.id);
      resolved.push({
        id: previous.id,
        mealId,
        foodId: previous.foodId,
        foodNameSnapshot: previous.foodNameSnapshot,
        kcalPer100gSnapshot: previous.kcalPer100gSnapshot,
        proteinSnapshot: previous.proteinSnapshot,
        carbsSnapshot: previous.carbsSnapshot,
        fatSnapshot: previous.fatSnapshot,
        grams: String(item.grams),
        sortOrder,
      });
    } else {
      const food = item.foodId ? foods.get(item.foodId) : undefined;
      if (!food || food.archivedAt) return { ok: false, error: "Food not found. Choose an active food from the library." };
      resolved.push({
        mealId,
        foodId: food.id,
        foodNameSnapshot: food.name,
        kcalPer100gSnapshot: food.kcalPer100g,
        proteinSnapshot: food.proteinPer100g,
        carbsSnapshot: food.carbsPer100g,
        fatSnapshot: food.fatPer100g,
        grams: String(item.grams),
        sortOrder,
      });
    }
  }
  return { ok: true, items: resolved };
}
