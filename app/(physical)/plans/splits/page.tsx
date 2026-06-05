import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSplits } from "@/lib/queries/physical";
import { SplitList } from "../../_components/SplitList";

export const dynamic = "force-dynamic";

export default async function SplitsPage() {
  const rows = await getSplits();
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Splits</h1>
          <p className="text-sm text-muted-foreground">Ordered day rotations of tagged sessions.</p>
        </div>
        <Link href="/plans/splits/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New split</Button>
        </Link>
      </div>
      <SplitList rows={rows} />
    </div>
  );
}
