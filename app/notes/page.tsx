import { PageHeader } from "@/components/page-header";
import { getNotesPage, getNoteCategories } from "@/lib/queries/notes";
import { noteListFilters } from "@/lib/notes/list";
import { NotesListClient } from "./_components/NotesListClient";

export const dynamic = "force-dynamic";

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = noteListFilters(params);
  const [{ notes, hasMore }, categories] = await Promise.all([getNotesPage(filters), getNoteCategories()]);
  return (
    <div>
      <PageHeader title="Beleške" description="Ideje, zapisi i liste na jednom mestu." />
      <NotesListClient notes={notes} categories={categories} filters={filters} hasMore={hasMore} createOpen={params.new === "1"} />
    </div>
  );
}
