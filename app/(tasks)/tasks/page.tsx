import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project } from "@/db/schema/tasks";
import { QuickAdd } from "../_components/QuickAdd";
import { TaskList } from "../_components/TaskList";
import { TaskForm } from "../_components/TaskForm";
import { ContextFilter } from "../_components/ContextFilter";
import { StatusFilter } from "../_components/StatusFilter";
import { PriorityFilter } from "../_components/PriorityFilter";
import { fetchTasks, type TaskFilters } from "@/lib/tasks-query";
import type { TaskStatus } from "@/db/schema/tasks";

export const dynamic = "force-dynamic";

const allStatuses = new Set<string>([
  "active",
  "all",
  "backlog",
  "in_progress",
  "waiting_for",
  "canceled",
  "done",
]);

function parseFilters(sp: Record<string, string | string[] | undefined>): TaskFilters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = get("status");
  return {
    status: status && allStatuses.has(status) ? (status as TaskFilters["status"]) : "active",
    projectId: get("project") || undefined,
    contextId: get("context") || undefined,
    priorityId: get("priority") || undefined,
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [tasks, projects, contexts, priorities] = await Promise.all([
    fetchTasks(filters),
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(isNull(project.archivedAt))
      .orderBy(asc(project.name)),
    db.select().from(context).orderBy(asc(context.name)),
    db
      .select({ id: priority.id, name: priority.name, color: priority.color })
      .from(priority)
      .orderBy(asc(priority.name)),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} shown</p>
        </div>
        <TaskForm projects={projects} priorities={priorities} />
      </header>
      <QuickAdd />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <StatusFilter />
        <PriorityFilter priorities={priorities} />
        <ContextFilter contexts={contexts} />
      </div>
      <TaskList tasks={tasks} />
    </div>
  );
}
