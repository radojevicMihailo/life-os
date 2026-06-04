import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { mealTemplate, mealTemplateItem } from "@/db/schema/meals";
import { Button } from "@/components/ui/button";
import { mealTotals } from "@/lib/meals/totals";
import { ApplyTemplateButton } from "../_components/ApplyTemplateButton";

export default async function TemplatesPage() {
  const templates = await db
    .select()
    .from(mealTemplate)
    .orderBy(desc(mealTemplate.updatedAt));
  const items = templates.length
    ? await db
        .select()
        .from(mealTemplateItem)
        .where(inArray(mealTemplateItem.templateId, templates.map((t) => t.id)))
    : [];
  const byTemplate = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byTemplate.get(it.templateId) ?? [];
    arr.push(it);
    byTemplate.set(it.templateId, arr);
  }
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Templates</h1>
        <Button asChild>
          <Link href="/meals/templates/new">New template</Link>
        </Button>
      </div>
      <ul className="divide-y border rounded">
        {templates.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            No templates yet.
          </li>
        )}
        {templates.map((t) => {
          const totals = mealTotals(byTemplate.get(t.id) ?? []);
          return (
            <li
              key={t.id}
              className="p-3 flex items-center justify-between gap-3"
            >
              <Link href={`/meals/templates/${t.id}`} className="flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(totals.kcal)} kcal · P{totals.protein.toFixed(1)} ·
                  C{totals.carbs.toFixed(1)} · F{totals.fat.toFixed(1)}
                </div>
              </Link>
              <ApplyTemplateButton templateId={t.id} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
