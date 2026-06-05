"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { workoutPlan, workoutPlanExercise } from "@/db/schema/physical";
import { workoutPlanPayloadSchema } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

export async function createWorkoutPlan(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = workoutPlanPayloadSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(workoutPlan)
      .values({ name: data.name, notes: data.notes ?? null })
      .returning({ id: workoutPlan.id });

    if (data.exercises.length > 0) {
      await tx.insert(workoutPlanExercise).values(
        data.exercises.map((e) => ({
          planId: row.id,
          exerciseId: e.exerciseId,
          setCount: e.setCount,
          sortOrder: e.sortOrder,
          linkNext: e.linkNext,
        })),
      );
    }
    return row.id;
  });

  revalidatePhysicalRoutes({ workoutPlanId: id });
  return { ok: true, data: { id } };
}

export async function updateWorkoutPlan(planId: string, raw: unknown): Promise<ActionResult> {
  const parsed = workoutPlanPayloadSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(workoutPlan)
      .set({ name: data.name, notes: data.notes ?? null, updatedAt: sql`now()` })
      .where(eq(workoutPlan.id, planId));

    await tx.delete(workoutPlanExercise).where(eq(workoutPlanExercise.planId, planId));
    if (data.exercises.length > 0) {
      await tx.insert(workoutPlanExercise).values(
        data.exercises.map((e) => ({
          planId,
          exerciseId: e.exerciseId,
          setCount: e.setCount,
          sortOrder: e.sortOrder,
          linkNext: e.linkNext,
        })),
      );
    }
  });
  revalidatePhysicalRoutes({ workoutPlanId: planId });
  return { ok: true, data: undefined };
}

export async function archiveWorkoutPlan(planId: string): Promise<ActionResult> {
  await db
    .update(workoutPlan)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(workoutPlan.id, planId));
  revalidatePhysicalRoutes({ workoutPlanId: planId });
  return { ok: true, data: undefined };
}

export async function deleteWorkoutPlan(planId: string): Promise<ActionResult> {
  await db.delete(workoutPlan).where(eq(workoutPlan.id, planId));
  revalidatePhysicalRoutes({ workoutPlanId: planId });
  return { ok: true, data: undefined };
}
