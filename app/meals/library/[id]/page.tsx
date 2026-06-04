import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { foodItem } from "@/db/schema/meals";
import { FoodForm } from "../../_components/FoodForm";

export default async function EditFoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db.select().from(foodItem).where(eq(foodItem.id, id)).limit(1);
  if (!row) notFound();
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Edit food</h1>
      <FoodForm
        mode={{ kind: "edit", id: row.id }}
        initial={{
          name: row.name,
          brand: row.brand ?? "",
          kcalPer100g: String(Number(row.kcalPer100g)),
          proteinPer100g: String(Number(row.proteinPer100g)),
          carbsPer100g: String(Number(row.carbsPer100g)),
          fatPer100g: String(Number(row.fatPer100g)),
        }}
      />
    </div>
  );
}
