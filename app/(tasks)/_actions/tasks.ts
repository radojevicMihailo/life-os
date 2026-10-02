"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { task, taskContext, type TaskStatus } from "@/db/schema/tasks";
import { recurrenceDates } from "@/lib/task-recurrence";
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/validation/tasks";
import { revalidateTaskRoutes } from "./_revalidate";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const contextIds = parsed.data.contextIds ?? [];

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
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

    if (contextIds.length > 0) {
      await tx
        .insert(taskContext)
        .values(contextIds.map((contextId) => ({ taskId: row.id, contextId })));
    }
    return row.id;
  });

  revalidateTaskRoutes();
  return { ok: true, data: { id } };
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(task).where(eq(task.id, id)).for("update");
    if (!existing) return fail("Task not found");
    const actionAt = patch.actionAt !== undefined ? patch.actionAt : existing.actionAt;
    const actionEndAt = actionAt === null ? null : patch.actionEndAt !== undefined ? patch.actionEndAt : existing.actionEndAt;
    if (actionAt && actionEndAt && actionEndAt < actionAt) return fail("Kraj aktivnosti ne može biti pre početka.");
    const { contextIds, ...fields } = patch;
    await tx.update(task).set({ ...fields, actionEndAt, updatedAt: sql`now()` }).where(eq(task.id, id));
    if (contextIds !== undefined) {
      await tx.delete(taskContext).where(eq(taskContext.taskId, id));
      if (contextIds.length) await tx.insert(taskContext).values(contextIds.map((contextId) => ({ taskId: id, contextId })));
    }
    return { ok: true, data: undefined } as ActionResult;
  });
  if (!result.ok) return result;

  revalidateTaskRoutes({ taskId: id });
  return { ok: true, data: undefined };
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status");

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(task).where(eq(task.id, id)).for("update");
    if (!existing) return fail("Task not found");
    if (status === "done" && existing.status !== "done" && existing.recurrence) {
      const [completed] = await tx.insert(task).values({
        title: existing.title, notes: existing.notes, projectId: existing.projectId,
        parentTaskId: existing.parentTaskId, priorityId: existing.priorityId,
        status: "done", actionAt: existing.actionAt, actionEndAt: existing.actionEndAt,
        dueAt: existing.dueAt, recurrenceParentId: existing.id,
      }).returning({ id: task.id });
      const links = await tx.select().from(taskContext).where(eq(taskContext.taskId, id));
      if (links.length) await tx.insert(taskContext).values(links.map((link) => ({ taskId: completed.id, contextId: link.contextId })));
      await tx.update(task).set({
        ...recurrenceDates({ ...existing, recurrence: existing.recurrence }),
        updatedAt: sql`now()`,
      }).where(eq(task.id, id));
    } else {
      await tx.update(task).set({ status, updatedAt: sql`now()` }).where(eq(task.id, id));
    }
    return { ok: true, data: undefined } as ActionResult;
  });
  if (!result.ok) return result;

  revalidateTaskRoutes({ taskId: id });
  return { ok: true, data: undefined };
}

export async function toggleTask(id: string): Promise<ActionResult> {
  const existing = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!existing) return fail("Task not found");
  return setTaskStatus(id, existing.status === "done" ? "backlog" : "done");
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await db.delete(task).where(eq(task.id, id));
  revalidateTaskRoutes({ taskId: id });
  return { ok: true, data: undefined };
}
