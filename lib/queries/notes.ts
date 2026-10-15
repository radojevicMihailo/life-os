import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { note, noteCategory } from "@/db/schema/notes";
import { escapeNoteSearch, NOTES_PAGE_SIZE, NOTE_PREVIEW_LENGTH, type NoteListFilters } from "@/lib/notes/list";

export async function getNotesPage(filters: NoteListFilters) {
  const pattern = `%${escapeNoteSearch(filters.query)}%`;
  const rows = await db.select({
    id: note.id,
    title: note.title,
    kind: note.kind,
    // Search the complete body in SQL; send only a bounded preview to the browser.
    body: sql<string>`left(${note.body}, ${NOTE_PREVIEW_LENGTH})`,
    categoryId: note.categoryId,
    categoryName: noteCategory.name,
    updatedAt: note.updatedAt,
  }).from(note)
    .leftJoin(noteCategory, eq(note.categoryId, noteCategory.id))
    .where(and(
      filters.query ? or(ilike(note.title, pattern), ilike(note.body, pattern)) : undefined,
      filters.category !== "all" ? eq(note.categoryId, filters.category) : undefined,
    ))
    .orderBy(desc(note.updatedAt), asc(note.id))
    .limit(NOTES_PAGE_SIZE + 1)
    .offset((filters.page - 1) * NOTES_PAGE_SIZE);
  return { notes: rows.slice(0, NOTES_PAGE_SIZE), hasMore: rows.length > NOTES_PAGE_SIZE };
}

export async function getNoteCategories() {
  return db.select({ id: noteCategory.id, name: noteCategory.name }).from(noteCategory).orderBy(asc(noteCategory.name));
}
