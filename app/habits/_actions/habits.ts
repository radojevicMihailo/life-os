"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { habit } from "@/db/schema/habits";
import {
  createHabitSchema,
  updateHabitSchema,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "@/lib/validation/habits";
import { revalidateHabitRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createHabit(
  input: CreateHabitInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createHabitSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const v = parsed.data;
  const [row] = await db
    .insert(habit)
    .values({
      title: v.title,
      description: v.description ?? null,
      kind: v.kind,
      targetCount: v.targetCount,
      unit: v.unit ?? null,
      cadence: v.cadence,
      weeklyTarget: v.weeklyTarget,
      weekdays: v.weekdays,
      startDate: v.startDate,
      endDate: v.endDate ?? null,
    })
    .returning({ id: habit.id });

  revalidateHabitRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function updateHabit(input: UpdateHabitInput): Promise<ActionResult> {
  const parsed = updateHabitSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  await db
    .update(habit)
    .set({
      title: patch.title,
      description: patch.description ?? null,
      kind: patch.kind,
      targetCount: patch.targetCount,
      unit: patch.unit ?? null,
      cadence: patch.cadence,
      weeklyTarget: patch.weeklyTarget,
      weekdays: patch.weekdays,
      startDate: patch.startDate,
      endDate: patch.endDate ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(habit.id, id));

  revalidateHabitRoutes({ habitId: id });
  return { ok: true, data: undefined };
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  await db
    .update(habit)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(habit.id, id));
  revalidateHabitRoutes({ habitId: id });
  return { ok: true, data: undefined };
}

export async function unarchiveHabit(id: string): Promise<ActionResult> {
  await db
    .update(habit)
    .set({ archivedAt: null, updatedAt: sql`now()` })
    .where(eq(habit.id, id));
  revalidateHabitRoutes({ habitId: id });
  return { ok: true, data: undefined };
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  await db.delete(habit).where(eq(habit.id, id));
  revalidateHabitRoutes({ habitId: id });
  return { ok: true, data: undefined };
}
