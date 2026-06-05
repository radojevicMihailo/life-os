import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getExercises, getWorkoutPlan } from "@/lib/queries/physical";
import { WorkoutPlanForm } from "../../../_components/WorkoutPlanForm";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, exercises] = await Promise.all([getWorkoutPlan(id), getExercises()]);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans/workouts" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Workout plans
      </Link>
      <h1 className="text-2xl font-semibold">{data.plan.name}</h1>
      <WorkoutPlanForm
        exercises={exercises}
        initial={{
          id: data.plan.id,
          name: data.plan.name,
          notes: data.plan.notes,
          archivedAt: data.plan.archivedAt,
          exercises: data.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            setCount: e.setCount,
            sortOrder: e.sortOrder,
            linkNext: e.linkNext,
          })),
        }}
      />
    </div>
  );
}
