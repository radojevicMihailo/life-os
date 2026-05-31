import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getModalities, getModalityWithFields } from "@/lib/queries/physical";
import { PlanForm } from "../../_components/PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const modalities = await getModalities();
  if (modalities.length === 0) {
    return <div className="mx-auto max-w-2xl px-6 py-8">No modalities.</div>;
  }
  if (!modalityId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-4">
        <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> Plans
        </Link>
        <h1 className="text-2xl font-semibold">Pick a modality</h1>
        <ul className="space-y-2">
          {modalities.map((m) => (
            <li key={m.id}>
              <a href={`/plans/new?modality=${m.id}`} className="block rounded-md border px-4 py-3 hover:bg-accent">
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const data = await getModalityWithFields(modalityId);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <h1 className="text-2xl font-semibold">New {data.modality.name} plan</h1>
      <PlanForm
        modalityId={modalityId}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
      />
    </div>
  );
}
