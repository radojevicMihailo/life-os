import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import Link from "next/link";
import { and, between, sql } from "drizzle-orm";
import { db } from "@/db";
import { meal, mealItem } from "@/db/schema/meals";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "../_components/CalendarGrid";
import { getMealTargets } from "../_actions/settings";

export default async function MealsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month
    ? parse(sp.month, "yyyy-MM", new Date())
    : startOfMonth(new Date());
  const start = format(startOfMonth(month), "yyyy-MM-dd");
  const end = format(endOfMonth(month), "yyyy-MM-dd");

  const rows = await db
    .select({
      date: meal.date,
      kcal: sql<string>`
        coalesce(sum(${mealItem.kcalPer100gSnapshot} * ${mealItem.grams} / 100), 0)
      `,
    })
    .from(meal)
    .leftJoin(mealItem, sql`${mealItem.mealId} = ${meal.id}`)
    .where(and(between(meal.date, start, end)))
    .groupBy(meal.date);

  const kcalByDate: Record<string, number> = {};
  for (const r of rows) kcalByDate[r.date] = Number(r.kcal);

  const targets = await getMealTargets();
  const prev = format(addMonths(month, -1), "yyyy-MM");
  const next = format(addMonths(month, 1), "yyyy-MM");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/meals/calendar?month=${prev}`}>‹</Link>
          </Button>
          <h1 className="text-xl font-semibold">
            {format(month, "MMMM yyyy")}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/meals/calendar?month=${next}`}>›</Link>
          </Button>
        </div>
      </div>
      <CalendarGrid
        month={month}
        kcalByDate={kcalByDate}
        kcalTarget={targets.kcal}
      />
    </div>
  );
}
