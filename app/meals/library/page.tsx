import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import { Button } from "@/components/ui/button";
import { MealsNav } from "../_components/MealsNav";

export default async function FoodLibraryPage() {
  const rows = await db
    .select()
    .from(foodItem)
    .where(isNull(foodItem.archivedAt))
    .orderBy(desc(foodItem.updatedAt))
    .limit(500);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <MealsNav />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Food library</h1>
        <Button asChild>
          <Link href="/meals/library/new">New food</Link>
        </Button>
      </div>
      <ul className="divide-y border rounded">
        {rows.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            No foods yet. Add one or import from OpenFoodFacts.
          </li>
        )}
        {rows.map((f) => (
          <li key={f.id} className="p-3 flex items-center justify-between">
            <Link href={`/meals/library/${f.id}`} className="flex-1">
              <div className="font-medium">{f.name}</div>
              <div className="text-sm text-muted-foreground">
                {f.brand ? `${f.brand} · ` : ""}
                {Number(f.kcalPer100g)} kcal · P{Number(f.proteinPer100g)} ·
                C{Number(f.carbsPer100g)} · F{Number(f.fatPer100g)} per 100g
                {f.source === "off" ? " · OFF" : ""}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
