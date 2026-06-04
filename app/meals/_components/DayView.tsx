import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { meal, mealItem } from "@/db/schema/meals";
import { Button } from "@/components/ui/button";
import { dayTotals } from "@/lib/meals/totals";
import { getMealTargets } from "../_actions/settings";
import { AddMealDialog } from "./AddMealDialog";
import { MealCard } from "./MealCard";
import { TargetsBar } from "./TargetsBar";

export async function DayView({ date }: { date: string }) {
  const meals = await db
    .select()
    .from(meal)
    .where(eq(meal.date, date))
    .orderBy(meal.eatenAt, meal.createdAt);

  const itemRows = meals.length
    ? await db
        .select()
        .from(mealItem)
        .where(inArray(mealItem.mealId, meals.map((m) => m.id)))
        .orderBy(mealItem.sortOrder)
    : [];

  const byMeal = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const arr = byMeal.get(it.mealId) ?? [];
    arr.push(it);
    byMeal.set(it.mealId, arr);
  }

  const totals = dayTotals(Array.from(byMeal.values()));
  const targets = await getMealTargets();
  const day = parseISO(date);
  const prev = format(addDays(day, -1), "yyyy-MM-dd");
  const next = format(addDays(day, 1), "yyyy-MM-dd");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/meals/${prev}`}>‹</Link>
          </Button>
          <h1 className="text-xl font-semibold">
            {format(day, "EEE, MMM d, yyyy")}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/meals/${next}`}>›</Link>
          </Button>
        </div>
        <AddMealDialog date={date} />
      </div>
      <TargetsBar totals={totals} targets={targets} />
      <div className="space-y-3">
        {meals.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded p-4">
            No meals logged. Click &ldquo;Add meal&rdquo; to start.
          </div>
        )}
        {meals.map((m) => (
          <MealCard
            key={m.id}
            meal={{
              id: m.id,
              date: m.date,
              name: m.name,
              eatenAt: m.eatenAt,
              items: byMeal.get(m.id) ?? [],
            }}
          />
        ))}
      </div>
    </div>
  );
}
