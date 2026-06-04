import { describe, expect, it } from "vitest";
import { itemTotals, mealTotals, dayTotals } from "./totals";

const row = (kcal: number, p: number, c: number, f: number, grams: number) => ({
  kcalPer100gSnapshot: String(kcal),
  proteinSnapshot: String(p),
  carbsSnapshot: String(c),
  fatSnapshot: String(f),
  grams: String(grams),
});

describe("itemTotals", () => {
  it("scales per-100g values by grams", () => {
    expect(itemTotals(row(250, 10, 30, 5, 200))).toEqual({
      kcal: 500,
      protein: 20,
      carbs: 60,
      fat: 10,
    });
  });
  it("handles fractional grams", () => {
    expect(itemTotals(row(400, 0, 0, 0, 25))).toEqual({
      kcal: 100,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("mealTotals", () => {
  it("sums items", () => {
    const items = [row(100, 5, 10, 1, 100), row(200, 0, 0, 0, 50)];
    expect(mealTotals(items)).toEqual({
      kcal: 200,
      protein: 5,
      carbs: 10,
      fat: 1,
    });
  });
  it("empty meal is zeros", () => {
    expect(mealTotals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("dayTotals", () => {
  it("sums meals", () => {
    const m1 = [row(100, 1, 2, 3, 100)];
    const m2 = [row(200, 4, 5, 6, 50)];
    expect(dayTotals([m1, m2])).toEqual({
      kcal: 200,
      protein: 3,
      carbs: 4.5,
      fat: 6,
    });
  });
});
