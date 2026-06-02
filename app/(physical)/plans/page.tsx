import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlans, getTags } from "@/lib/queries/physical";
import { PlanList } from "../_components/PlanList";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tagId = typeof sp.tag === "string" ? sp.tag : undefined;
  const [tags, rows] = await Promise.all([getTags(), getPlans({ tagId })]);
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="text-sm text-muted-foreground">Reference workout templates.</p>
        </div>
        <Link href="/plans/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New plan</Button>
        </Link>
      </div>
      <PlanList rows={rows} tags={tags} />
    </div>
  );
}
