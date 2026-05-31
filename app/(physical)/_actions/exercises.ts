"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercise } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  modalityId: z.uuid(),
  categoryId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
});

export async function addExercise(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(exercise)
      .values({
        modalityId: parsed.data.modalityId,
        categoryId: parsed.data.categoryId ?? null,
        name: parsed.data.name,
      })
      .returning({ id: exercise.id });
    revalidatePhysicalRoutes({ modalityId: parsed.data.modalityId });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Exercise name must be unique");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function updateExercise(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db.update(exercise).set({ ...patch, updatedAt: sql`now()` }).where(eq(exercise.id, id));
  const [row] = await db
    .select({ modalityId: exercise.modalityId })
    .from(exercise)
    .where(eq(exercise.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function archiveExercise(id: string): Promise<ActionResult> {
  const [row] = await db
    .select({ modalityId: exercise.modalityId })
    .from(exercise)
    .where(eq(exercise.id, id));
  await db
    .update(exercise)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(exercise.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}
