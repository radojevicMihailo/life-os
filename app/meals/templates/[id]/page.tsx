import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { mealTemplate, mealTemplateItem } from "@/db/schema/meals";
import { MealsNav } from "../../_components/MealsNav";
import { TemplateForm } from "../../_components/TemplateForm";
import type { DraftItem } from "../../_components/MealItemRow";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t] = await db
    .select()
    .from(mealTemplate)
    .where(eq(mealTemplate.id, id))
    .limit(1);
  if (!t) notFound();
  const items = await db
    .select()
    .from(mealTemplateItem)
    .where(eq(mealTemplateItem.templateId, id))
    .orderBy(mealTemplateItem.sortOrder);

  const initialItems: DraftItem[] = items
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <MealsNav />
      <h1 className="text-xl font-semibold mb-4">Edit template</h1>
      <TemplateForm
        mode={{ kind: "edit", id: t.id }}
        initialName={t.name}
        initialItems={initialItems}
      />
    </div>
  );
}
