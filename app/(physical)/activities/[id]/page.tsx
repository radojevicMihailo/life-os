import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getActivity,
  getAllFields,
  getExerciseGroups,
  getExercises,
  getTagGroups,
  getTags,
} from "@/lib/queries/physical";
import { DynamicActivityForm } from "../../_components/DynamicActivityForm";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getActivity(id);
  if (!data) notFound();

  const [tagGroups, tags, fields, exerciseGroups, exercises] = await Promise.all([
    getTagGroups(),
    getTags(),
    getAllFields(),
    getExerciseGroups(),
    getExercises(),
  ]);

  const subrows = data.subrows.map((s) => ({
    exerciseId: s.exerciseId,
    values: (s.values ?? {}) as Record<string, unknown>,
    sortOrder: s.sortOrder,
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Activities
      </Link>
      <h1 className="text-2xl font-semibold">Edit activity</h1>
      <DynamicActivityForm
        tagGroups={tagGroups}
        tags={tags}
        topFields={fields.topFields}
        subrowFields={fields.subrowFields}
        exerciseGroups={exerciseGroups}
        exercises={exercises}
        initial={{
          id: data.activity.id,
          performedAt: data.activity.performedAt,
          values: (data.activity.values ?? {}) as Record<string, unknown>,
          comment: data.activity.comment,
          tagIds: data.tagIds,
          subrows,
        }}
      />
    </div>
  );
}
