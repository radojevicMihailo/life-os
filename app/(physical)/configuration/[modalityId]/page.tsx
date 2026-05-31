import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getModalityWithFields } from "@/lib/queries/physical";
import { Separator } from "@/components/ui/separator";
import { FieldEditor } from "../../_components/FieldEditor";
import { CategoryEditor } from "../../_components/CategoryEditor";
import { ExerciseEditor } from "../../_components/ExerciseEditor";

export const dynamic = "force-dynamic";

export default async function ModalityDetailPage({
  params,
}: {
  params: Promise<{ modalityId: string }>;
}) {
  const { modalityId } = await params;
  const data = await getModalityWithFields(modalityId);
  if (!data) notFound();

  const topFields = data.fields.filter((f) => f.scope === "top");
  const subrowFields = data.fields.filter((f) => f.scope === "subrow");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-8">
      <div>
        <Link
          href="/configuration"
          className="inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Configuration
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{data.modality.name}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top-level fields</h2>
        <FieldEditor modalityId={modalityId} scope="top" fields={topFields} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subrow fields</h2>
        <FieldEditor modalityId={modalityId} scope="subrow" fields={subrowFields} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <CategoryEditor modalityId={modalityId} categories={data.categories} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exercises</h2>
        <ExerciseEditor
          modalityId={modalityId}
          categories={data.categories}
          exercises={data.exercises}
        />
      </section>
    </div>
  );
}
