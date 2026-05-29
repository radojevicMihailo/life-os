"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { task } from "@/db/schema/tasks";
import { nextOccurrence } from "@/lib/recurrence";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/validation/tasks";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateTaskRoutes() {
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .insert(task)
    .values({
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      projectId: parsed.data.projectId ?? null,
      parentTaskId: parsed.data.parentTaskId ?? null,
      priority: parsed.data.priority ?? 0,
      dueAt: parsed.data.dueAt ?? null,
      recurrence: parsed.data.recurrence ?? null,
    })
    .returning({ id: task.id });

  revalidateTaskRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  await db
    .update(task)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(task.id, id));

  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function toggleTask(id: string): Promise<ActionResult> {
  const existing = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!existing) return fail("Task not found");

  const now = new Date();

  if (!existing.completedAt && existing.recurrence) {
    const fromDate = existing.dueAt ?? now;
    const next = nextOccurrence(existing.recurrence, fromDate);

    await db.transaction(async (tx) => {
      await tx.insert(task).values({
        title: existing.title,
        notes: existing.notes,
        projectId: existing.projectId,
        parentTaskId: existing.parentTaskId,
        priority: existing.priority,
        dueAt: existing.dueAt,
        completedAt: now,
        recurrenceParentId: existing.id,
      });
      await tx
        .update(task)
        .set({ dueAt: next, updatedAt: sql`now()` })
        .where(eq(task.id, id));
    });

    revalidateTaskRoutes();
    return { ok: true, data: undefined };
  }

  await db
    .update(task)
    .set({
      completedAt: existing.completedAt ? null : now,
      updatedAt: sql`now()`,
    })
    .where(eq(task.id, id));

  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await db.delete(task).where(eq(task.id, id));
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}
