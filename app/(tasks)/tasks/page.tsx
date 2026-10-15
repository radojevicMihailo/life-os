import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project } from "@/db/schema/tasks";
import { TasksTriageShell } from "../_components/TasksTriageShell";
import { TaskForm } from "../_components/TaskForm";
import { ContextFilter } from "../_components/ContextFilter";
import { StatusFilter } from "../_components/StatusFilter";
import { PriorityFilter } from "../_components/PriorityFilter";
import { fetchTasks, type TaskFilters, type TaskSort } from "@/lib/tasks-query";
import type { TaskListView } from "../_components/TaskList";
import Link from "next/link";
import { listLimit } from "@/lib/search";

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
  const scalar = (key: string) => Array.isArray(sp[key]) ? sp[key][0] : sp[key];
  const limit = listLimit(scalar("limit"));
  const pageValue = Number(scalar("page"));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 100000) : 1;
  const query = (scalar("q") ?? "").trim().slice(0, 200);

  const [tasks, projects, contexts, priorities] = await Promise.all([
    fetchTasks({ ...filters, query, limit: limit + 1, offset: (page - 1) * limit }),
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

  const visibleTasks = tasks.slice(0, limit);
  const moreParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const item = Array.isArray(value) ? value[0] : value;
    if (item) moreParams.set(key, item);
  }
  moreParams.set("page", String(page + 1));
  const previousParams = new URLSearchParams(moreParams);
  previousParams.set("page", String(page - 1));
  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Zadaci</h1>
          <p className="text-sm text-muted-foreground">{visibleTasks.length} prikazano{tasks.length > limit ? " · ima još rezultata" : ""}</p>
        </div>
        <TaskForm key={scalar("new") === "1" ? "create" : "default"} initiallyOpen={scalar("new") === "1"} projects={projects} priorities={priorities} contexts={contexts} />
      </header>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <StatusFilter />
        <PriorityFilter priorities={priorities} />
        <ContextFilter contexts={contexts} />
      </div>
      <TasksTriageShell tasks={visibleTasks} view={view} sort={sort} query={query} />
      <nav className="flex items-center justify-between gap-3" aria-label="Stranice zadataka">
        {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm hover:bg-accent" href={`/tasks?${previousParams}`} scroll={false}>← Prethodno</Link> : <span />}
        <span className="text-xs text-muted-foreground">Stranica {page}</span>
        {tasks.length > limit ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm hover:bg-accent" href={`/tasks?${moreParams}`} scroll={false}>Učitaj još →</Link> : <span />}
      </nav>
    </div>
  );
}
