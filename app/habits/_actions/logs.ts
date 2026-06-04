"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habitLog } from "@/db/schema/habits";
import {
  upsertLogSchema,
  deleteLogSchema,
  type UpsertLogInput,
  type DeleteLogInput,
} from "@/lib/validation/habits";
import { revalidateHabitRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function upsertLog(input: UpsertLogInput): Promise<ActionResult> {
  const parsed = upsertLogSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { habitId, date, count } = parsed.data;

  await db
    .insert(habitLog)
    .values({ habitId, date, count })
    .onConflictDoUpdate({
      target: [habitLog.habitId, habitLog.date],
      set: { count },
    });

  revalidateHabitRoutes();
  return { ok: true, data: undefined };
}

export async function deleteLog(input: DeleteLogInput): Promise<ActionResult> {
  const parsed = deleteLogSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { habitId, date } = parsed.data;

  await db
    .delete(habitLog)
    .where(and(eq(habitLog.habitId, habitId), eq(habitLog.date, date)));

  revalidateHabitRoutes();
  return { ok: true, data: undefined };
}
