"use server";

import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { note, noteItem } from "@/db/schema/notes";
import {
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  addItemSchema,
  updateItemTextSchema,
  toggleItemSchema,
  reorderItemSchema,
  deleteItemSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
  type AddItemInput,
  type UpdateItemTextInput,
  type ToggleItemInput,
  type ReorderItemInput,
} from "@/lib/validation/notes";
import { computeReorder } from "@/lib/notes/reorder";
import { revalidateNoteRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function touchNote(noteId: string) {
  await db.update(note).set({ updatedAt: sql`now()` }).where(eq(note.id, noteId));
}

export async function createNote(
  input: CreateNoteInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .insert(note)
    .values({ title: parsed.data.title, kind: parsed.data.kind })
    .returning({ id: note.id });

  revalidateNoteRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function updateNote(input: UpdateNoteInput): Promise<ActionResult> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  await db
    .update(note)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(note.id, id));

  revalidateNoteRoutes({ noteId: id });
  return { ok: true, data: undefined };
}

export async function deleteNote(input: { id: string }): Promise<ActionResult> {
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");

  await db.delete(note).where(eq(note.id, parsed.data.id));
  revalidateNoteRoutes();
  return { ok: true, data: undefined };
}

export async function addItem(input: AddItemInput): Promise<ActionResult<{ id: string }>> {
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(${noteItem.position}), -1)` })
    .from(noteItem)
    .where(eq(noteItem.noteId, parsed.data.noteId));

  const [row] = await db
    .insert(noteItem)
    .values({
      noteId: parsed.data.noteId,
      text: parsed.data.text,
      position: Number(max) + 1,
    })
    .returning({ id: noteItem.id });

  await touchNote(parsed.data.noteId);
  revalidateNoteRoutes({ noteId: parsed.data.noteId });
  return { ok: true, data: { id: row.id } };
}

export async function updateItemText(input: UpdateItemTextInput): Promise<ActionResult> {
  const parsed = updateItemTextSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .update(noteItem)
    .set({ text: parsed.data.text })
    .where(eq(noteItem.id, parsed.data.id))
    .returning({ noteId: noteItem.noteId });

  if (row) {
    await touchNote(row.noteId);
    revalidateNoteRoutes({ noteId: row.noteId });
  }
  return { ok: true, data: undefined };
}

export async function toggleItem(input: ToggleItemInput): Promise<ActionResult> {
  const parsed = toggleItemSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");

  const [row] = await db
    .update(noteItem)
    .set({ done: parsed.data.done })
    .where(eq(noteItem.id, parsed.data.id))
    .returning({ noteId: noteItem.noteId });

  if (row) {
    await touchNote(row.noteId);
    revalidateNoteRoutes({ noteId: row.noteId });
  }
  return { ok: true, data: undefined };
}

export async function reorderItems(input: ReorderItemInput): Promise<ActionResult> {
  const parsed = reorderItemSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");

  const [target] = await db
    .select({ noteId: noteItem.noteId })
    .from(noteItem)
    .where(eq(noteItem.id, parsed.data.id));
  if (!target) return fail("Item not found");

  const items = await db
    .select({ id: noteItem.id, position: noteItem.position })
    .from(noteItem)
    .where(eq(noteItem.noteId, target.noteId))
    .orderBy(asc(noteItem.position));

  const updates = computeReorder(items, parsed.data.id, parsed.data.direction);
  for (const u of updates) {
    await db.update(noteItem).set({ position: u.position }).where(eq(noteItem.id, u.id));
  }

  if (updates.length) {
    await touchNote(target.noteId);
    revalidateNoteRoutes({ noteId: target.noteId });
  }
  return { ok: true, data: undefined };
}

export async function deleteItem(input: { id: string }): Promise<ActionResult> {
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");

  const [row] = await db
    .delete(noteItem)
    .where(eq(noteItem.id, parsed.data.id))
    .returning({ noteId: noteItem.noteId });

  if (row) {
    await touchNote(row.noteId);
    revalidateNoteRoutes({ noteId: row.noteId });
  }
  return { ok: true, data: undefined };
}
