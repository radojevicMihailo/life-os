import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSplit, getTagGroups, getTags } from "@/lib/queries/physical";
import { SplitForm } from "../../../_components/SplitForm";

export const dynamic = "force-dynamic";

export default async function EditSplitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, tagGroups, tags] = await Promise.all([getSplit(id), getTagGroups(), getTags()]);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans/splits" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Splits
      </Link>
      <h1 className="text-2xl font-semibold">{data.split.name}</h1>
      <SplitForm
        tagGroups={tagGroups}
        tags={tags}
        initial={{
          id: data.split.id,
          name: data.split.name,
          notes: data.split.notes,
          archivedAt: data.split.archivedAt,
          days: data.days.map((d) => ({ tagIds: d.tagIds, sortOrder: d.sortOrder })),
        }}
      />
    </div>
  );
}
