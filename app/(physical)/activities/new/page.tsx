import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getAllFields,
  getExerciseGroups,
  getExercises,
  getTagGroups,
  getTags,
} from "@/lib/queries/physical";
import { ActivityForm } from "../../_components/activity/ActivityForm";

export const dynamic = "force-dynamic";

export default async function NewActivityPage() {
  const [tagGroups, tags, fields, exerciseGroups, exercises] = await Promise.all([
    getTagGroups(),
    getTags(),
    getAllFields(),
    getExerciseGroups(),
    getExercises(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/activities"
        className="inline-flex items-center text-sm text-muted-foreground hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Aktivnosti
      </Link>
      <h1 className="text-2xl font-semibold">Zabeleži trening</h1>
      <p className="text-sm text-muted-foreground">Jedan trening, svi njegovi delovi.</p>
      <ActivityForm
        tagGroups={tagGroups}
        tags={tags}
        topFields={fields.topFields}
        subrowFields={fields.subrowFields}
        exerciseGroups={exerciseGroups}
        exercises={exercises}
      />
    </div>
  );
}
