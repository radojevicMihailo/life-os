"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { milestone } from "@/db/schema/goals";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
} from "@/lib/validation/goals";
import { revalidateGoalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createMilestone(
  input: CreateMilestoneInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createMilestoneSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Unos nije ispravan.");

  const [row] = await db
    .insert(milestone)
    .values({
      goalId: parsed.data.goalId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ?? null,
    })
    .returning({ id: milestone.id });

  revalidateGoalRoutes({ goalId: parsed.data.goalId });
  return { ok: true, data: { id: row.id } };
}

export async function updateMilestone(input: UpdateMilestoneInput): Promise<ActionResult> {
  const parsed = updateMilestoneSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Unos nije ispravan.");
  const { id, ...patch } = parsed.data;

  const existing = await db.query.milestone.findFirst({ where: eq(milestone.id, id) });
  if (!existing) return fail("Međukorak nije pronađen.");

  await db
    .update(milestone)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(milestone.id, id));

  revalidateGoalRoutes({ goalId: existing.goalId });
  return { ok: true, data: undefined };
}

export async function toggleMilestone(id: string): Promise<ActionResult> {
  const existing = await db.query.milestone.findFirst({ where: eq(milestone.id, id) });
  if (!existing) return fail("Međukorak nije pronađen.");

  await db
    .update(milestone)
    .set({ doneAt: existing.doneAt ? null : new Date(), updatedAt: sql`now()` })
    .where(eq(milestone.id, id));

  revalidateGoalRoutes({ goalId: existing.goalId });
  return { ok: true, data: undefined };
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  const existing = await db.query.milestone.findFirst({ where: eq(milestone.id, id) });
  if (!existing) return fail("Međukorak nije pronađen.");

  await db.delete(milestone).where(eq(milestone.id, id));
  revalidateGoalRoutes({ goalId: existing.goalId });
  return { ok: true, data: undefined };
}
