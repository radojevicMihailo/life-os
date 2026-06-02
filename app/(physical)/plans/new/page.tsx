import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getAllFields,
  getExerciseGroups,
  getExercises,
  getTagGroups,
  getTags,
} from "@/lib/queries/physical";
import { PlanForm } from "../../_components/PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const [tagGroups, tags, fields, exerciseGroups, exercises] = await Promise.all([
    getTagGroups(),
    getTags(),
    getAllFields(),
    getExerciseGroups(),
    getExercises(),
  ]);
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <h1 className="text-2xl font-semibold">New plan</h1>
      <PlanForm
        tagGroups={tagGroups}
        tags={tags}
        subrowFields={fields.subrowFields}
        exerciseGroups={exerciseGroups}
        exercises={exercises}
      />
    </div>
  );
}
