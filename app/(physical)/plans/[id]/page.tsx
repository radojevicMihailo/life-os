import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPlan } from "@/lib/queries/physical";
import { PlanForm } from "../../_components/PlanForm";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlan(id);
  if (!data) notFound();
  const subrows = data.subrows.map((s) => ({
    exerciseId: s.exerciseId,
    values: (s.values ?? {}) as Record<string, unknown>,
    sortOrder: s.sortOrder,
  }));
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <h1 className="text-2xl font-semibold">{data.plan.name}</h1>
      <p className="text-xs text-muted-foreground">{data.modality.name}</p>
      <PlanForm
        modalityId={data.modality.id}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
        initial={{
          id: data.plan.id,
          name: data.plan.name,
          notes: data.plan.notes,
          subrows,
          archivedAt: data.plan.archivedAt,
        }}
      />
    </div>
  );
}
