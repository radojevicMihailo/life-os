"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { noteCategory } from "@/db/schema/notes";
import { revalidateNoteRoutes } from "./_revalidate";

const nameSchema = z.string().trim().min(1, "Unesi naziv kategorije.").max(80);
const idSchema = z.uuid();

export async function createNoteCategory(name: string) {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Neispravan naziv." };
  const [created] = await db.insert(noteCategory).values({ name: parsed.data }).onConflictDoNothing().returning({ id: noteCategory.id });
  if (!created) return { ok: false as const, error: "Kategorija sa tim nazivom već postoji." };
  revalidateNoteRoutes();
  return { ok: true as const };
}

export async function renameNoteCategory(id: string, name: string) {
  const parsedId = idSchema.safeParse(id);
  const parsedName = nameSchema.safeParse(name);
  if (!parsedId.success || !parsedName.success) return { ok: false as const, error: "Neispravan naziv kategorije." };
  let updated: { id: string } | undefined;
  try {
    [updated] = await db.update(noteCategory).set({ name: parsedName.data }).where(eq(noteCategory.id, parsedId.data)).returning({ id: noteCategory.id });
  } catch (error) {
    if (error instanceof Error && (error as Error & { cause?: { code?: string } }).cause?.code === "23505") {
      return { ok: false as const, error: "Kategorija sa tim nazivom već postoji." };
    }
    throw error;
  }
  if (!updated) return { ok: false as const, error: "Kategorija nije pronađena." };
  revalidateNoteRoutes();
  return { ok: true as const };
}

export async function deleteNoteCategory(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Neispravna kategorija." };
  await db.delete(noteCategory).where(eq(noteCategory.id, parsed.data));
  revalidateNoteRoutes();
  return { ok: true as const };
}
