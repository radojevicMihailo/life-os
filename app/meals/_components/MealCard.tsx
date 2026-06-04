import { Button } from "@/components/ui/button";
import { itemTotals, mealTotals } from "@/lib/meals/totals";
import { EditMealDialog, type EditMealInitial } from "./EditMealDialog";
import type { DraftItem } from "./MealItemRow";

type ItemRow = {
  id: string;
  foodId: string | null;
  foodNameSnapshot: string;
  kcalPer100gSnapshot: string;
  proteinSnapshot: string;
  carbsSnapshot: string;
  fatSnapshot: string;
  grams: string;
};

type MealRow = {
  id: string;
  date: string;
  name: string;
  eatenAt: Date | null;
  items: ItemRow[];
};

function toDraft(items: ItemRow[]): DraftItem[] {
  return items
    .filter((i) => i.foodId !== null)
    .map((i) => ({
      foodId: i.foodId!,
      name: i.foodNameSnapshot,
      brand: null,
      kcalPer100g: Number(i.kcalPer100gSnapshot),
      proteinPer100g: Number(i.proteinSnapshot),
      carbsPer100g: Number(i.carbsSnapshot),
      fatPer100g: Number(i.fatSnapshot),
      grams: Number(i.grams),
    }));
}

export function MealCard({ meal }: { meal: MealRow }) {
  const totals = mealTotals(meal.items);
  const time = meal.eatenAt
    ? new Date(meal.eatenAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const initial: EditMealInitial = {
    id: meal.id,
    date: meal.date,
    name: meal.name,
    time: meal.eatenAt
      ? new Date(meal.eatenAt).toISOString().slice(11, 16)
      : "",
    items: toDraft(meal.items),
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{meal.name}</div>
          {time && <div className="text-xs text-muted-foreground">{time}</div>}
        </div>
        <EditMealDialog
          initial={initial}
          trigger={<Button variant="ghost" size="sm">Edit</Button>}
        />
      </div>
      <ul className="text-sm space-y-1">
        {meal.items.map((i) => {
          const t = itemTotals(i);
          return (
            <li
              key={i.id}
              className="flex items-center justify-between text-muted-foreground"
            >
              <span>
                {i.foodNameSnapshot}{" "}
                <span className="text-xs">({Number(i.grams)}g)</span>
              </span>
              <span>{Math.round(t.kcal)} kcal</span>
            </li>
          );
        })}
      </ul>
      <div className="text-sm font-medium text-right">
        {Math.round(totals.kcal)} kcal · P{totals.protein.toFixed(1)} · C
        {totals.carbs.toFixed(1)} · F{totals.fat.toFixed(1)}
      </div>
    </div>
  );
}
