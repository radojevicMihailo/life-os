"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { task, type TaskStatus } from "@/db/schema/tasks";
import { nextOccurrence } from "@/lib/recurrence";
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
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
  revalidatePath("/projects");
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
      priorityId: parsed.data.priorityId ?? null,
      status: parsed.data.status ?? "backlog",
      actionAt: parsed.data.actionAt ?? null,
      actionEndAt: parsed.data.actionEndAt ?? null,
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

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status");

  const existing = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!existing) return fail("Task not found");

  const now = new Date();

  if (status === "done" && existing.status !== "done" && existing.recurrence) {
    const fromDate = existing.dueAt ?? existing.actionAt ?? now;
    const next = nextOccurrence(existing.recurrence, fromDate);
    const nextAction = existing.actionAt
      ? nextOccurrence(existing.recurrence, existing.actionAt)
      : null;

    await db.transaction(async (tx) => {
      await tx.insert(task).values({
        title: existing.title,
        notes: existing.notes,
        projectId: existing.projectId,
        parentTaskId: existing.parentTaskId,
        priorityId: existing.priorityId,
        status: "done",
        actionAt: existing.actionAt,
        dueAt: existing.dueAt,
        recurrenceParentId: existing.id,
      });
      await tx
        .update(task)
        .set({
          dueAt: next,
          actionAt: nextAction,
          updatedAt: sql`now()`,
        })
        .where(eq(task.id, id));
    });

    revalidateTaskRoutes();
    return { ok: true, data: undefined };
  }

  await db
    .update(task)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(task.id, id));

  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function toggleTask(id: string): Promise<ActionResult> {
  const existing = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!existing) return fail("Task not found");
  return setTaskStatus(id, existing.status === "done" ? "backlog" : "done");
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await db.delete(task).where(eq(task.id, id));
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}
