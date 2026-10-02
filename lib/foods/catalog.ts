import catalog from "./catalog.json";

export const foodCatalog = catalog.foods;
const catalogById = new Map(foodCatalog.map((food) => [food.id, food]));

/** Only attribute unchanged seed values to USDA; users can edit their foods. */
export function getCatalogSource(food: {
  id: string;
  name: string;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
}) {
  const original = catalogById.get(food.id);
  if (!original || original.name !== food.name) return undefined;
  for (const key of ["kcalPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g"] as const) {
    if (Number(food[key]) !== original[key]) return undefined;
  }
  return original;
}
