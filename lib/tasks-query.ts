import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project, task, taskContext } from "@/db/schema/tasks";
import type { TaskStatus } from "@/db/schema/tasks";
import type { TaskWithMeta } from "@/app/(tasks)/_components/TaskRow";

export type TaskSort = "smart" | "due" | "created" | "title";

export type TaskFilters = {
  status?: TaskStatus | "active" | "all";
  projectId?: string;
  contextId?: string;
  priorityId?: string;
  parentTaskId?: string | null;
  sort?: TaskSort;
};

const SMART_RANK = sql`${priority.rank} ASC NULLS LAST`;
const DUE_ASC_NULLS_LAST = sql`${task.dueAt} ASC NULLS LAST`;

function orderClauses(sort: TaskSort): SQL[] {
  switch (sort) {
    case "due":
      return [DUE_ASC_NULLS_LAST, desc(task.createdAt)];
    case "created":
      return [desc(task.createdAt)];
    case "title":
      return [asc(task.title)];
    case "smart":
    default:
      return [SMART_RANK, DUE_ASC_NULLS_LAST, desc(task.createdAt)];
  }
}

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

  if (filters.parentTaskId === null) {
    conditions.push(isNull(task.parentTaskId));
  } else if (typeof filters.parentTaskId === "string") {
    conditions.push(eq(task.parentTaskId, filters.parentTaskId));
  }

  if (filters.contextId) {
    const links = await db
      .select({ taskId: taskContext.taskId })
      .from(taskContext)
      .where(eq(taskContext.contextId, filters.contextId));
    const ids = links.map((l) => l.taskId);
    if (ids.length === 0) return [];
    conditions.push(inArray(task.id, ids));
  }

  const sort = filters.sort ?? "smart";

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
    .orderBy(...orderClauses(sort));

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
