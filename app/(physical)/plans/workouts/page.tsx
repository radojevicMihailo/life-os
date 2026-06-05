import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkoutPlans } from "@/lib/queries/physical";
import { WorkoutPlanList } from "../../_components/WorkoutPlanList";

export const dynamic = "force-dynamic";

export default async function WorkoutPlansPage() {
  const rows = await getWorkoutPlans();
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workout plans</h1>
          <p className="text-sm text-muted-foreground">Gym templates: exercises and set counts.</p>
        </div>
        <Link href="/plans/workouts/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New plan</Button>
        </Link>
      </div>
      <WorkoutPlanList rows={rows} />
    </div>
  );
}
