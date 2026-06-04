import { describe, expect, it } from "vitest";
import {
  createFoodSchema,
  createMealSchema,
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
