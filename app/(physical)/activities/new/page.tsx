import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getAllFields,
  getExerciseGroups,
  getExercises,
  getTagGroups,
  getTags,
} from "@/lib/queries/physical";
import { DynamicActivityForm } from "../../_components/DynamicActivityForm";

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
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link
        href="/activities"
        className="inline-flex items-center text-sm text-muted-foreground hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Activities
      </Link>
      <h1 className="text-2xl font-semibold">Log activity</h1>
      <DynamicActivityForm
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
