import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActivities, getModalities } from "@/lib/queries/physical";
import { ActivityFilters } from "../_components/ActivityFilters";
import { ActivityList } from "../_components/ActivityList";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const [modalities, rows] = await Promise.all([
    getModalities(),
    getActivities({ modalityId }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">Log and review sessions.</p>
        </div>
        <Link href="/activities/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log activity</Button>
        </Link>
      </div>
      <ActivityFilters modalities={modalities} />
      <ActivityList rows={rows} />
    </div>
  );
}
