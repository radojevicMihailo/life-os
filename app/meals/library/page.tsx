import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import { Button } from "@/components/ui/button";
import { getCatalogSource } from "@/lib/foods/catalog";

export default async function FoodLibraryPage() {
  const rows = await db
    .select()
    .from(foodItem)
    .where(isNull(foodItem.archivedAt))
    .orderBy(desc(foodItem.updatedAt))
    .limit(500);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Biblioteka namirnica</h1>
        <Button asChild>
          <Link href="/meals/library/new">Nova namirnica</Link>
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Vrednosti se odnose na 100 g jestivog dela namirnice u navedenom stanju: sirovo, kuvano ili oceđeno.
        Podaci iz baze USDA su prosečne vrednosti. Za konkretan proizvod proveri deklaraciju.
      </p>
      <ul className="divide-y border rounded">
        {rows.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Još nema namirnica. Dodaj namirnicu ili je uvezi iz baze Open Food Facts.
          </li>
        )}
        {rows.map((f) => {
          const catalogSource = getCatalogSource(f);
          return (
          <li key={f.id} className="p-3 flex items-center justify-between">
            <Link href={`/meals/library/${f.id}`} className="flex-1">
              <div className="font-medium">{f.name}</div>
              <div className="text-sm text-muted-foreground">
                {f.brand ? `${f.brand} · ` : ""}
                {Number(f.kcalPer100g)} kcal · P{Number(f.proteinPer100g)} ·
                C{Number(f.carbsPer100g)} · F{Number(f.fatPer100g)} na 100 g
                {f.source === "off" ? " · OFF" : ""}
              </div>
            </Link>
            {catalogSource && (
              <a
                href={catalogSource.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={catalogSource.sourceDescription}
                className="ml-3 shrink-0 text-xs text-muted-foreground underline"
              >
                Izvor: USDA
              </a>
            )}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
