import { describe, expect, it } from "vitest";
import { resolveMealItems } from "./snapshots";
import { itemTotals } from "./totals";
import type { FoodItem, MealItem } from "@/db/schema/meals";

const mealId = "meal";
const existing: MealItem = {
  id: "existing", mealId, foodId: "food", foodNameSnapshot: "Original oats",
  kcalPer100gSnapshot: "379.00", proteinSnapshot: "13.00", carbsSnapshot: "67.00", fatSnapshot: "7.00", grams: "100.00", sortOrder: 0,
};
const editedFood: FoodItem = {
  id: "food", name: "Updated oats", brand: null, kcalPer100g: "500.00", proteinPer100g: "20.00", carbsPer100g: "50.00", fatPer100g: "15.00",
  source: "manual", offId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

describe("meal history snapshots", () => {
  it("preserves historical nutrition and names after library changes, while new additions use current values", () => {
    const result = resolveMealItems(mealId, [
      { mealItemId: existing.id, foodId: existing.foodId, grams: 150 },
      { foodId: editedFood.id, grams: 100 },
    ], [existing], new Map([[editedFood.id, editedFood]]));
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.error);
    expect(result.items[0]).toMatchObject({ id: existing.id, foodNameSnapshot: "Original oats", kcalPer100gSnapshot: "379.00", grams: "150" });
    expect(itemTotals(result.items[0] as MealItem).kcal).toBe(568.5);
    expect(result.items[1]).toMatchObject({ foodNameSnapshot: "Updated oats", kcalPer100gSnapshot: "500.00", grams: "100" });
    expect(itemTotals(result.items[1] as MealItem).kcal).toBe(500);
  });
  it("keeps archived and deleted foods editable from stored history without needing library rows", () => {
    const deleted = { ...existing, foodId: null };
    const result = resolveMealItems(mealId, [{ mealItemId: deleted.id, foodId: null, grams: 80 }], [deleted], new Map());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items[0]).toMatchObject({ foodId: null, foodNameSnapshot: "Original oats", kcalPer100gSnapshot: "379.00", grams: "80" });
    expect(resolveMealItems(mealId, [{ mealItemId: existing.id, foodId: existing.foodId, grams: 100 }], [existing], new Map()).ok).toBe(true);
  });
  it("rejects foreign IDs, changed food identity, repeated IDs and nonexistent newly added foods", () => {
    const item = { mealItemId: existing.id, foodId: existing.foodId, grams: 100 };
    const foods = new Map([[editedFood.id, editedFood]]);
    expect(resolveMealItems("other-meal", [item], [existing], foods).ok).toBe(false);
    expect(resolveMealItems(mealId, [{ ...item, mealItemId: "foreign" }], [existing], foods).ok).toBe(false);
    expect(resolveMealItems(mealId, [{ ...item, foodId: "changed" }], [existing], foods).ok).toBe(false);
    expect(resolveMealItems(mealId, [item, item], [existing], foods).ok).toBe(false);
    expect(resolveMealItems(mealId, [{ foodId: "missing", grams: 100 }], [], foods).ok).toBe(false);
    expect(resolveMealItems(mealId, [{ foodId: null, grams: 100 }], [], foods).ok).toBe(false);
  });
});

it("rejects newly selected archived foods while allowing their existing historical entries", () => {
  const archived = { ...editedFood, archivedAt: new Date() };
  const foods = new Map([[archived.id, archived]]);
  expect(resolveMealItems(mealId, [{ foodId: archived.id, grams: 100 }], [], foods).ok).toBe(false);
  expect(resolveMealItems(mealId, [{ mealItemId: existing.id, foodId: existing.foodId, grams: 100 }], [existing], foods).ok).toBe(true);
});
