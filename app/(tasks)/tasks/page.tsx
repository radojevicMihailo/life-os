import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { project, tag } from "@/db/schema/tasks";
import { QuickAdd } from "../_components/QuickAdd";
import { TaskList } from "../_components/TaskList";
import { TaskForm } from "../_components/TaskForm";
import { TagFilter } from "../_components/TagFilter";
import { StatusFilter } from "../_components/StatusFilter";
import { fetchTasks, type TaskFilters } from "@/lib/tasks-query";

export const dynamic = "force-dynamic";

function parseFilters(sp: Record<string, string | string[] | undefined>): TaskFilters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = get("status");
  const priorityRaw = get("priority");
  return {
    status: status === "done" || status === "all" ? status : "open",
    projectId: get("project") || undefined,
    tagId: get("tag") || undefined,
    priority: priorityRaw !== undefined ? Number(priorityRaw) : undefined,
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [tasks, projects, tags] = await Promise.all([
    fetchTasks(filters),
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(isNull(project.archivedAt))
      .orderBy(asc(project.name)),
    db.select().from(tag).orderBy(asc(tag.name)),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} shown</p>
        </div>
        <TaskForm projects={projects} />
      </header>
      <QuickAdd />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <StatusFilter />
        <TagFilter tags={tags} />
      </div>
      <TaskList tasks={tasks} />
    </div>
  );
}
