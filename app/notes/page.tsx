import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { note, noteCategory } from "@/db/schema/notes";
import { PageHeader } from "@/components/page-header";
import { NotesListClient } from "./_components/NotesListClient";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, categories] = await Promise.all([db
    .select({
      id: note.id,
      title: note.title,
      kind: note.kind,
      body: note.body,
      categoryId: note.categoryId,
      categoryName: noteCategory.name,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .leftJoin(noteCategory, eq(note.categoryId, noteCategory.id))
    .orderBy(desc(note.updatedAt)), db.select({ id: noteCategory.id, name: noteCategory.name }).from(noteCategory).orderBy(asc(noteCategory.name))]);

  return (
    <div>
      <PageHeader title="Beleške" description="Ideje, zapisi i liste na jednom mestu." />
      <NotesListClient notes={notes} categories={categories} />
    </div>
  );
}
