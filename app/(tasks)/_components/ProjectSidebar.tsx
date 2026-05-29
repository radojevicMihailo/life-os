import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { project } from "@/db/schema/tasks";

export async function ProjectSidebar() {
  const projects = await db
    .select({ id: project.id, name: project.name })
    .from(project)
    .where(isNull(project.archivedAt))
    .orderBy(asc(project.name));

  if (projects.length === 0) return null;

  return (
    <div className="px-3 pt-4">
      <div className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Projects
      </div>
      <ul className="space-y-0.5">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="block rounded-md px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-accent hover:text-foreground"
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
