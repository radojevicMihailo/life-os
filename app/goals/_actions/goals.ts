"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { goal, type GoalStatus } from "@/db/schema/goals";
import {
  createGoalSchema,
  updateGoalSchema,
  goalStatusSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/lib/validation/goals";
import { revalidateGoalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createGoal(input: CreateGoalInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .insert(goal)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "active",
      targetDate: parsed.data.targetDate ?? null,
    })
    .returning({ id: goal.id });

  revalidateGoalRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function updateGoal(input: UpdateGoalInput): Promise<ActionResult> {
  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  await db
    .update(goal)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(goal.id, id));

  revalidateGoalRoutes({ goalId: id });
  return { ok: true, data: undefined };
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<ActionResult> {
  const parsed = goalStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status");

  await db
    .update(goal)
    .set({ status: parsed.data, updatedAt: sql`now()` })
    .where(eq(goal.id, id));

  revalidateGoalRoutes({ goalId: id });
  return { ok: true, data: undefined };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await db.delete(goal).where(eq(goal.id, id));
  revalidateGoalRoutes({ goalId: id });
  return { ok: true, data: undefined };
}
