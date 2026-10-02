import { describe, expect, it } from "vitest";
import {
  createFoodSchema,
  createMealSchema,
  updateMealSchema,
  mealTargetsSchema,
} from "./meals";

describe("createFoodSchema", () => {
  it("accepts valid input", () => {
    const r = createFoodSchema.safeParse({
      name: "Oats",
      brand: null,
      kcalPer100g: 379,
      proteinPer100g: 13,
      carbsPer100g: 67,
      fatPer100g: 7,
      source: "manual",
      offId: null,
    });
    expect(r.success).toBe(true);
  });
  it("rejects empty name", () => {
    expect(
      createFoodSchema.safeParse({
        name: "",
        kcalPer100g: 1,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
        source: "manual",
      }).success,
    ).toBe(false);
  });
  it("rejects negative kcal", () => {
    expect(
      createFoodSchema.safeParse({
        name: "x",
        kcalPer100g: -1,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
        source: "manual",
      }).success,
    ).toBe(false);
  });
});

describe("createMealSchema", () => {
  it("requires at least one item", () => {
    expect(
      createMealSchema.safeParse({
        date: "2026-06-04",
        name: "lunch",
        items: [],
      }).success,
    ).toBe(false);
  });
  it("rejects grams <= 0", () => {
    expect(
      createMealSchema.safeParse({
        date: "2026-06-04",
        name: "lunch",
        items: [{ foodId: crypto.randomUUID(), grams: 0 }],
      }).success,
    ).toBe(false);
  });
  it("accepts minimal valid meal", () => {
    expect(
      createMealSchema.safeParse({
        date: "2026-06-04",
        name: "lunch",
        items: [{ foodId: crypto.randomUUID(), grams: 100 }],
      }).success,
    ).toBe(true);
  });
});

describe("mealTargetsSchema", () => {
  it("nulls allowed", () => {
    expect(
      mealTargetsSchema.safeParse({
        kcal: null,
        protein: null,
        carbs: null,
        fat: null,
      }).success,
    ).toBe(true);
  });
  it("rejects negatives", () => {
    expect(
      mealTargetsSchema.safeParse({
        kcal: -1,
        protein: null,
        carbs: null,
        fat: null,
      }).success,
    ).toBe(false);
  });
});


describe("updateMealSchema history references", () => {
  const mealId = "11111111-1111-4111-8111-111111111111";
  const itemId = "22222222-2222-4222-8222-222222222222";
  const foodId = "33333333-3333-4333-8333-333333333333";
  it("accepts deleted foods only when tied to an existing historical item", () => {
    const base = { id: mealId, date: "2026-10-02", name: "Lunch" };
    expect(updateMealSchema.safeParse({ ...base, items: [{ mealItemId: itemId, foodId: null, grams: 100 }] }).success).toBe(true);
    expect(updateMealSchema.safeParse({ ...base, items: [{ foodId: null, grams: 100 }] }).success).toBe(false);
    expect(createMealSchema.safeParse({ ...base, items: [{ mealItemId: itemId, foodId: null, grams: 100 }] }).success).toBe(false);
  });
  it("retains valid identity references and strips client-supplied nutrient snapshots", () => {
    const parsed = updateMealSchema.parse({ id: mealId, date: "2026-10-02", name: "Lunch", items: [{ mealItemId: itemId, foodId, grams: 100, kcalPer100gSnapshot: "0", foodNameSnapshot: "Fake" }] });
    expect(parsed.items).toEqual([{ mealItemId: itemId, foodId, grams: 100 }]);
  });
});
