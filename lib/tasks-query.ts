import "server-only";
import { and, desc, eq, inArray, isNull, isNotNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { project, tag, task, taskTag } from "@/db/schema/tasks";
import type { TaskWithMeta } from "@/app/(tasks)/_components/TaskRow";

export type TaskFilters = {
  status?: "open" | "done" | "all";
  projectId?: string;
  tagId?: string;
  priority?: number;
};

export async function fetchTasks(filters: TaskFilters = {}): Promise<TaskWithMeta[]> {
  const conditions: SQL[] = [];
  const status = filters.status ?? "open";
  if (status === "open") conditions.push(isNull(task.completedAt));
  else if (status === "done") conditions.push(isNotNull(task.completedAt));
  if (filters.projectId) conditions.push(eq(task.projectId, filters.projectId));
  if (typeof filters.priority === "number") conditions.push(eq(task.priority, filters.priority));

  let taskIdsForTag: string[] | null = null;
  if (filters.tagId) {
    const links = await db
      .select({ taskId: taskTag.taskId })
      .from(taskTag)
      .where(eq(taskTag.tagId, filters.tagId));
    taskIdsForTag = links.map((l) => l.taskId);
    if (taskIdsForTag.length === 0) return [];
    conditions.push(inArray(task.id, taskIdsForTag));
  }

  const rows = await db
    .select({ task, projectName: project.name })
    .from(task)
    .leftJoin(project, eq(task.projectId, project.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(task.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.task.id);
  const tagLinks = await db
    .select({
      taskId: taskTag.taskId,
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })
    .from(taskTag)
    .innerJoin(tag, eq(taskTag.tagId, tag.id))
    .where(inArray(taskTag.taskId, ids));

  const tagsByTask = new Map<string, { id: string; name: string; color: string | null }[]>();
  for (const t of tagLinks) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }

  return rows.map((r) => ({
    ...r.task,
    projectName: r.projectName,
    tags: tagsByTask.get(r.task.id) ?? [],
  }));
}
