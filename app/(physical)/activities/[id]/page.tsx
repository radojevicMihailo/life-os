import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActivity } from "@/lib/queries/physical";
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
      <h1 className="text-2xl font-semibold">{data.modality.name} activity</h1>
      <DynamicActivityForm
        modalityId={data.modality.id}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
        initial={{
          id: data.activity.id,
          performedAt: data.activity.performedAt,
          values: (data.activity.values ?? {}) as Record<string, unknown>,
          comment: data.activity.comment,
          subrows,
        }}
      />
    </div>
  );
}
