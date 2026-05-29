import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project } from "@/db/schema/tasks";
import { QuickAdd } from "../_components/QuickAdd";
import { TasksTriageShell } from "../_components/TasksTriageShell";
import { TaskForm } from "../_components/TaskForm";
import { ContextFilter } from "../_components/ContextFilter";
import { StatusFilter } from "../_components/StatusFilter";
import { PriorityFilter } from "../_components/PriorityFilter";
import { fetchTasks, type TaskFilters, type TaskSort } from "@/lib/tasks-query";
import type { TaskListView } from "../_components/TaskList";

export const dynamic = "force-dynamic";

const STATUSES = new Set<string>([
  "active",
  "all",
  "backlog",
  "in_progress",
  "waiting_for",
  "canceled",
  "done",
]);

const SORTS = new Set<TaskSort>(["smart", "due", "created", "title"]);
const VIEWS = new Set<TaskListView>(["grouped", "flat"]);

function parseFilters(sp: Record<string, string | string[] | undefined>): {
  filters: TaskFilters;
  view: TaskListView;
  sort: TaskSort;
} {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const statusRaw = get("status");
  const sortRaw = get("sort");
  const viewRaw = get("view");

  const sort: TaskSort = sortRaw && SORTS.has(sortRaw as TaskSort) ? (sortRaw as TaskSort) : "smart";
  const view: TaskListView =
    viewRaw && VIEWS.has(viewRaw as TaskListView) ? (viewRaw as TaskListView) : "grouped";

  return {
    filters: {
      status: statusRaw && STATUSES.has(statusRaw) ? (statusRaw as TaskFilters["status"]) : "active",
      projectId: get("project") || undefined,
      contextId: get("context") || undefined,
      priorityId: get("priority") || undefined,
      parentTaskId: null,
      sort,
    },
    view,
    sort,
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { filters, view, sort } = parseFilters(sp);

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
      .orderBy(asc(priority.rank)),
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
      <TasksTriageShell tasks={tasks} view={view} sort={sort} />
    </div>
  );
}
