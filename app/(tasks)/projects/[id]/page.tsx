import { notFound } from "next/navigation";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { context, priority, project, task } from "@/db/schema/tasks";
import { TaskList } from "../../_components/TaskList";
import { TaskForm } from "../../_components/TaskForm";
import { ProjectDetailEditor } from "../../_components/ProjectDetailEditor";
import { EditableTitle } from "../../_components/EditableTitle";
import { fetchTasks } from "@/lib/tasks-query";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proj = await db.query.project.findFirst({ where: eq(project.id, id) });
  if (!proj) notFound();

  const [tasks, projects, priorities, contexts, counts] = await Promise.all([
    fetchTasks({ projectId: id, status: "all" }),
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(isNull(project.archivedAt))
      .orderBy(asc(project.name)),
    db
      .select({ id: priority.id, name: priority.name })
      .from(priority)
      .orderBy(asc(priority.rank)),
    db.select().from(context).orderBy(asc(context.name)),
    db
      .select({
        total: sql<number>`COUNT(*)`,
        done: sql<number>`COUNT(*) FILTER (WHERE ${task.status} = 'done')`,
      })
      .from(task)
      .where(eq(task.projectId, id)),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  const done = Number(counts[0]?.done ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <EditableTitle id={proj.id} value={proj.name} kind="project" />
        <TaskForm
          projects={projects}
          priorities={priorities}
          contexts={contexts}
          defaultProjectId={id}
          label="New task in project"
        />
      </header>

      <ProjectDetailEditor
        projectId={proj.id}
        status={proj.status}
        startAt={proj.startAt}
        dueAt={proj.dueAt}
      />

      <section className="space-y-2 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">
            {done} / {total} done · {pct}%
          </span>
        </div>
        <Progress value={pct} />
      </section>

      <TaskList tasks={tasks} />
    </div>
  );
}
