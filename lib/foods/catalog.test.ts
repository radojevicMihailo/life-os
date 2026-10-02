import { describe, expect, it } from "vitest";
import catalog from "./catalog.json";
import sourceExtract from "./usda-source-extract.json";
import { getCatalogSource } from "./catalog";

const nutrientKeys = {
  kcalPer100g: "1008",
  proteinPer100g: "1003",
  carbsPer100g: "1005",
  fatPer100g: "1004",
} as const;
const sources = new Map(sourceExtract.map((source) => [source.fdcId, source]));

function asRecord(food = catalog.foods[0]) {
  return {
    id: food.id, name: food.name,
    kcalPer100g: String(food.kcalPer100g),
    proteinPer100g: String(food.proteinPer100g),
    carbsPer100g: String(food.carbsPer100g),
    fatPer100g: String(food.fatPer100g),
  };
}

describe("Serbian food catalog", () => {
  it("contains 112 distinct foods, stable UUIDs and USDA references", () => {
    expect(catalog.foods).toHaveLength(112);
    for (const key of ["id", "name", "fdcId"] as const) {
      expect(new Set(catalog.foods.map(food => food[key])).size).toBe(catalog.foods.length);
    }
    for (const food of catalog.foods) {
      expect(food.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
      expect(food.sourceUrl).toBe(`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`);
    }
  });

  it("matches all 448 nutrient amounts and descriptions extracted from the downloaded USDA CSV", () => {
    expect(sourceExtract).toHaveLength(112);
    for (const food of catalog.foods) {
      const source = sources.get(food.fdcId)!;
      expect(food.sourceDescription).toBe(source.description);
      for (const [key, nutrientId] of Object.entries(nutrientKeys)) {
        const value = food[key as keyof typeof nutrientKeys];
        expect(value).toBe(source.nutrients[nutrientId as keyof typeof source.nutrients]);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(key === "kcalPer100g" ? 1000 : 100);
        expect(value * 100).toBeCloseTo(Math.round(value * 100), 8);
      }
    }
  });

  it("makes preparation explicit for grains, legumes, meat, fish and fresh produce", () => {
    for (const food of catalog.foods.filter(food => ["grains", "legumes", "meat", "fish", "vegetables", "fruit", "eggs"].includes(food.category))) {
      expect(food.name).toMatch(/\(.+\)/);
    }
    expect(catalog.foods.find(food => food.fdcId === 169756)?.kcalPer100g).toBe(365);
    expect(catalog.foods.find(food => food.fdcId === 169757)?.kcalPer100g).toBe(130);
  });

  it("includes clearly searchable Juneće / goveđe raw and cooked cuts without replacing original foods", () => {
    const beef = catalog.foods.filter(food => food.name.startsWith("Juneće / goveđe meso"));
    expect(beef).toHaveLength(6);
    expect(beef.map(food => food.fdcId)).toEqual([173053, 174693, 171767, 170641, 171796, 174034]);
    expect(beef.every(food => food.sourceDescription.startsWith("Beef,"))).toBe(true);
    expect(catalog.foods.find(food => food.fdcId === 174030)?.name).toBe("Mlevena govedina (sirova, 10% masti)");
    expect(catalog.foods.find(food => food.fdcId === 171767)?.kcalPer100g).toBe(139);
    expect(catalog.foods.find(food => food.fdcId === 170641)?.kcalPer100g).toBe(198);
  });

  it("attributes only unchanged catalog records to the source", () => {
    const food = asRecord();
    expect(getCatalogSource(food)?.fdcId).toBe(catalog.foods[0].fdcId);
    expect(getCatalogSource({ ...food, kcalPer100g: "99" })).toBeUndefined();
    expect(getCatalogSource({ ...food, name: "My own food" })).toBeUndefined();
    expect(getCatalogSource({ ...food, id: "unknown" })).toBeUndefined();
  });
});
