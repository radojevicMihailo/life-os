import { desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { travel, type Travel } from "@/db/schema/travels";
import { PageHeader } from "@/components/page-header";
import { belgradeDayKey } from "@/app/_lib/dashboard-model";
import { TravelQuickAdd } from "./_components/TravelQuickAdd";
import { TravelsWorkspace } from "./_components/TravelsWorkspace";

export const dynamic = "force-dynamic";

export default async function TravelsPage() {
  const rows: Travel[] = await db
    .select()
    .from(travel)
    .orderBy(asc(travel.startDate), desc(travel.createdAt));

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <PageHeader title="Putovanja" description="Planovi i mesta koja želiš da posetiš." />
        <TravelQuickAdd />
      </header>
      <TravelsWorkspace travels={rows} todayKey={belgradeDayKey(new Date())} />
    </div>
  );
}
