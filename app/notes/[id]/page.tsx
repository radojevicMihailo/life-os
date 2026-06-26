import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { note, noteItem } from "@/db/schema/notes";
import { PageHeader } from "@/components/page-header";
import { NoteEditor } from "../_components/NoteEditor";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db.select().from(note).where(eq(note.id, id));
  if (!row) notFound();

  const items = await db
    .select({
      id: noteItem.id,
      text: noteItem.text,
      done: noteItem.done,
      position: noteItem.position,
    })
    .from(noteItem)
    .where(eq(noteItem.noteId, id))
    .orderBy(asc(noteItem.position));

  return (
    <div>
      <PageHeader title="Note" />
      <NoteEditor
        id={row.id}
        initialTitle={row.title}
        initialKind={row.kind}
        initialBody={row.body}
        items={items}
      />
    </div>
  );
}
