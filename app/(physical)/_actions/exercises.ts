"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercise } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  groupId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
});

export async function addExercise(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(exercise)
      .values({
        groupId: parsed.data.groupId ?? null,
        name: parsed.data.name,
      })
      .returning({ id: exercise.id });
    revalidatePhysicalRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Exercise name must be unique");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  groupId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function updateExercise(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db.update(exercise).set({ ...patch, updatedAt: sql`now()` }).where(eq(exercise.id, id));
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}

export async function archiveExercise(id: string): Promise<ActionResult> {
  await db
    .update(exercise)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(exercise.id, id));
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}
