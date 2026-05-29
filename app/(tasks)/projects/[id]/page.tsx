import { notFound } from "next/navigation";
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { project } from "@/db/schema/tasks";
import { TaskList } from "../../_components/TaskList";
import { TaskForm } from "../../_components/TaskForm";
import { fetchTasks } from "@/lib/tasks-query";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proj = await db.query.project.findFirst({ where: eq(project.id, id) });
  if (!proj) notFound();

  const [tasks, projects] = await Promise.all([
    fetchTasks({ projectId: id, status: "open" }),
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(isNull(project.archivedAt))
      .orderBy(asc(project.name)),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{proj.name}</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} open</p>
        </div>
        <TaskForm projects={projects} defaultProjectId={id} label="New task in project" />
      </header>
      <TaskList tasks={tasks} />
    </div>
  );
}
