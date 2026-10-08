import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getActivity,
  getAllFields,
  getExerciseGroups,
  getExercises,
  getTagGroups,
  getRecordingSources,
  getTags,
} from "@/lib/queries/physical";
import { ActivityForm } from "../../../_components/activity/ActivityForm";
import { adaptStoredBlock } from "@/lib/physical/blocks";

export const dynamic = "force-dynamic";

export default async function ActivityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getActivity(id);
  if (!data) notFound();

  const [tagGroups, tags, fields, exerciseGroups, exercises, sources] = await Promise.all([
    getTagGroups(),
    getTags(),
    getAllFields(),
    getExerciseGroups(),
    getExercises(data.subrows.flatMap(b=>b.exerciseId?[b.exerciseId]:[])),
    getRecordingSources(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Aktivnosti
      </Link>
      <h1 className="text-2xl font-semibold">Izmeni trening</h1>
      <ActivityForm
        sources={sources}
        tagGroups={tagGroups}
        tags={tags}
        topFields={fields.topFields}
        subrowFields={fields.subrowFields}
        exerciseGroups={exerciseGroups}
        exercises={exercises}
        initial={{
          id: data.activity.id,
          title: data.activity.title,
          performedAt: data.activity.performedAt,
          values: (data.activity.values ?? {}) as Record<string, unknown>,
          comment: data.activity.comment,
          stravaUrl: data.activity.stravaUrl,
          tagIds: data.tagIds,
          blocks: data.subrows.map(adaptStoredBlock),
        }}
      />
    </div>
  );
}
