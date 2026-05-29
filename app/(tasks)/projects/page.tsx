import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { project, task } from "@/db/schema/tasks";
import { ProjectForm } from "../_components/ProjectForm";
import { ProjectRow } from "../_components/ProjectRow";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db
    .select({
      id: project.id,
      name: project.name,
      archivedAt: project.archivedAt,
      doneCount: sql<number>`(SELECT COUNT(*) FROM ${task} WHERE ${task.projectId} = ${project.id} AND ${task.status} = 'done')`,
      totalCount: sql<number>`(SELECT COUNT(*) FROM ${task} WHERE ${task.projectId} = ${project.id})`,
    })
    .from(project)
    .orderBy(asc(project.archivedAt), asc(project.name));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">{projects.length} total</p>
      </header>
      <ProjectForm />
      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          No projects yet.
        </div>
      ) : (
        <div className="space-y-1">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              id={p.id}
              name={p.name}
              archived={p.archivedAt != null}
              doneCount={Number(p.doneCount)}
              totalCount={Number(p.totalCount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
