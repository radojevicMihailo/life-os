import { desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { travel, type Travel } from "@/db/schema/travels";
import { TravelQuickAdd } from "./_components/TravelQuickAdd";
import { TravelsTable } from "./_components/TravelsTable";

export const dynamic = "force-dynamic";

export default async function TravelsPage() {
  const rows: Travel[] = await db
    .select()
    .from(travel)
    .orderBy(asc(travel.startDate), desc(travel.createdAt));

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Travels</h1>
        <TravelQuickAdd />
      </header>
      <TravelsTable travels={rows} />
    </div>
  );
}
