import { desc } from "drizzle-orm";
import { db } from "@/db";
import { note } from "@/db/schema/notes";
import { PageHeader } from "@/components/page-header";
import { NotesListClient } from "./_components/NotesListClient";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await db
    .select({
      id: note.id,
      title: note.title,
      kind: note.kind,
      body: note.body,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .orderBy(desc(note.updatedAt));

  return (
    <div>
      <PageHeader title="Notes" description="Free-form notes and todo lists" />
      <NotesListClient notes={notes} />
    </div>
  );
}
