import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActivities, getTags } from "@/lib/queries/physical";
import { ActivityList } from "../_components/ActivityList";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const [tags, rows] = await Promise.all([getTags(), getActivities({})]);
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
      <ActivityList rows={rows} tags={tags} />
    </div>
  );
}
