import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getExercises } from "@/lib/queries/physical";
import { WorkoutPlanForm } from "../../../_components/WorkoutPlanForm";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPlanPage() {
  const exercises = await getExercises();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans/workouts" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Workout plans
      </Link>
      <h1 className="text-2xl font-semibold">New workout plan</h1>
      <WorkoutPlanForm exercises={exercises} />
    </div>
  );
}
