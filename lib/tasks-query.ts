import "server-only";
import { and, desc, eq, inArray, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project, task, taskContext } from "@/db/schema/tasks";
import type { TaskStatus } from "@/db/schema/tasks";
import type { TaskWithMeta } from "@/app/(tasks)/_components/TaskRow";

export type TaskFilters = {
  status?: TaskStatus | "active" | "all";
  projectId?: string;
  contextId?: string;
  priorityId?: string;
};

export async function fetchTasks(filters: TaskFilters = {}): Promise<TaskWithMeta[]> {
  const conditions: SQL[] = [];
  const status = filters.status ?? "active";
  if (status === "active") {
    conditions.push(ne(task.status, "done"));
    conditions.push(ne(task.status, "canceled"));
  } else if (status !== "all") {
    conditions.push(eq(task.status, status));
  }
  if (filters.projectId) conditions.push(eq(task.projectId, filters.projectId));
  if (filters.priorityId) conditions.push(eq(task.priorityId, filters.priorityId));

  if (filters.contextId) {
    const links = await db
      .select({ taskId: taskContext.taskId })
      .from(taskContext)
      .where(eq(taskContext.contextId, filters.contextId));
    const ids = links.map((l) => l.taskId);
    if (ids.length === 0) return [];
    conditions.push(inArray(task.id, ids));
  }

  const rows = await db
    .select({
      task,
      projectName: project.name,
      priorityName: priority.name,
      priorityColor: priority.color,
    })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .leftJoin(priority, eq(task.priorityId, priority.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(task.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.task.id);
  const contextLinks = await db
    .select({
      taskId: taskContext.taskId,
      id: context.id,
      name: context.name,
      color: context.color,
    })
    .from(taskContext)
    .innerJoin(context, eq(taskContext.contextId, context.id))
    .where(inArray(taskContext.taskId, ids));

  const ctxByTask = new Map<string, { id: string; name: string; color: string | null }[]>();
  for (const c of contextLinks) {
    const list = ctxByTask.get(c.taskId) ?? [];
    list.push({ id: c.id, name: c.name, color: c.color });
    ctxByTask.set(c.taskId, list);
  }

  return rows.map((r) => ({
    ...r.task,
    projectName: r.projectName,
    priorityName: r.priorityName,
    priorityColor: r.priorityColor,
    contexts: ctxByTask.get(r.task.id) ?? [],
  }));
}
