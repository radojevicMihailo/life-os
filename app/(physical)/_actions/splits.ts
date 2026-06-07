"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { split, splitDay, splitDayTag, splitDayWorkoutPlan } from "@/db/schema/physical";
import { splitPayloadSchema } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

type DayInput = { tagIds: string[]; workoutPlanIds: string[]; sortOrder: number };

async function insertDaysWithTags(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  splitId: string,
  days: DayInput[],
) {
  if (days.length === 0) return;
  const inserted = await tx
    .insert(splitDay)
    .values(days.map((d) => ({ splitId, sortOrder: d.sortOrder })))
    .returning({ id: splitDay.id, sortOrder: splitDay.sortOrder });
  const bySort = new Map(inserted.map((r) => [r.sortOrder, r.id]));
  const tagRows = days.flatMap((d) => {
    const dayId = bySort.get(d.sortOrder);
    if (!dayId) return [];
    return d.tagIds.map((tagId) => ({ dayId, tagId }));
  });
  if (tagRows.length > 0) {
    await tx.insert(splitDayTag).values(tagRows);
  }
  const planRows = days.flatMap((d) => {
    const dayId = bySort.get(d.sortOrder);
    if (!dayId) return [];
    return d.workoutPlanIds.map((planId) => ({ dayId, planId }));
  });
  if (planRows.length > 0) {
    await tx.insert(splitDayWorkoutPlan).values(planRows);
  }
}

export async function createSplit(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = splitPayloadSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(split)
      .values({ name: data.name, notes: data.notes ?? null })
      .returning({ id: split.id });
    await insertDaysWithTags(tx, row.id, data.days);
    return row.id;
  });

  revalidatePhysicalRoutes({ splitId: id });
  return { ok: true, data: { id } };
}

export async function updateSplit(splitId: string, raw: unknown): Promise<ActionResult> {
  const parsed = splitPayloadSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(split)
      .set({ name: data.name, notes: data.notes ?? null, updatedAt: sql`now()` })
      .where(eq(split.id, splitId));

    await tx.delete(splitDay).where(eq(splitDay.splitId, splitId));
    await insertDaysWithTags(tx, splitId, data.days);
  });
  revalidatePhysicalRoutes({ splitId });
  return { ok: true, data: undefined };
}

export async function archiveSplit(splitId: string): Promise<ActionResult> {
  await db
    .update(split)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(split.id, splitId));
  revalidatePhysicalRoutes({ splitId });
  return { ok: true, data: undefined };
}

export async function deleteSplit(splitId: string): Promise<ActionResult> {
  await db.delete(split).where(eq(split.id, splitId));
  revalidatePhysicalRoutes({ splitId });
  return { ok: true, data: undefined };
}
