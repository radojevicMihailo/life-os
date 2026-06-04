export type Totals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type ItemSnapshot = {
  kcalPer100gSnapshot: string | number;
  proteinSnapshot: string | number;
  carbsSnapshot: string | number;
  fatSnapshot: string | number;
  grams: string | number;
};

function num(v: string | number): number {
  return typeof v === "number" ? v : Number(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function itemTotals(item: ItemSnapshot): Totals {
  const g = num(item.grams) / 100;
  return {
    kcal: round2(num(item.kcalPer100gSnapshot) * g),
    protein: round2(num(item.proteinSnapshot) * g),
    carbs: round2(num(item.carbsSnapshot) * g),
    fat: round2(num(item.fatSnapshot) * g),
  };
}

function addTotals(a: Totals, b: Totals): Totals {
  return {
    kcal: round2(a.kcal + b.kcal),
    protein: round2(a.protein + b.protein),
    carbs: round2(a.carbs + b.carbs),
    fat: round2(a.fat + b.fat),
  };
}

const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function mealTotals(items: ItemSnapshot[]): Totals {
  return items.reduce<Totals>((acc, it) => addTotals(acc, itemTotals(it)), ZERO);
}

export function dayTotals(meals: ItemSnapshot[][]): Totals {
  return meals.reduce<Totals>((acc, m) => addTotals(acc, mealTotals(m)), ZERO);
}
