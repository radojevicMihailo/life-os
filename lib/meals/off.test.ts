import { describe, expect, it } from "vitest";
import { normalizeOffProduct } from "./off";

describe("normalizeOffProduct", () => {
  it("uses energy-kcal_100g when present", () => {
    const out = normalizeOffProduct({
      code: "123",
      product_name: "Oats",
      brands: "Acme",
      nutriments: {
        "energy-kcal_100g": 379,
        proteins_100g: 13,
        carbohydrates_100g: 67,
        fat_100g: 7,
      },
    });
    expect(out).toEqual({
      offId: "123",
      name: "Oats",
      brand: "Acme",
      kcalPer100g: 379,
      proteinPer100g: 13,
      carbsPer100g: 67,
      fatPer100g: 7,
    });
  });

  it("falls back to energy-kj_100g / 4.184", () => {
    const out = normalizeOffProduct({
      code: "9",
      product_name: "X",
      nutriments: { "energy-kj_100g": 418.4 },
    });
    expect(out?.kcalPer100g).toBe(100);
  });

  it("skips products missing both kcal and kj", () => {
    expect(
      normalizeOffProduct({ code: "1", product_name: "X", nutriments: {} }),
    ).toBeNull();
  });

  it("skips products missing a usable name", () => {
    expect(
      normalizeOffProduct({
        code: "1",
        nutriments: { "energy-kcal_100g": 100 },
      }),
    ).toBeNull();
  });

  it("brand is null when blank", () => {
    const out = normalizeOffProduct({
      code: "1",
      product_name: "X",
      brands: "  ",
      nutriments: { "energy-kcal_100g": 50 },
    });
    expect(out?.brand).toBeNull();
  });
});
