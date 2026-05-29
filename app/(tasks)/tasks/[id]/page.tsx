import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { project, tag, task, taskTag } from "@/db/schema/tasks";
import { TaskRow } from "../../_components/TaskRow";
import { SubtaskAdd } from "../../_components/SubtaskAdd";
import { TaskTagsEditor } from "../../_components/TaskTagsEditor";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const t = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!t) notFound();

  const [proj, subtasks, allTags, attachedLinks] = await Promise.all([
    t.projectId
      ? db.query.project.findFirst({ where: eq(project.id, t.projectId) })
      : Promise.resolve(null),
    db.select().from(task).where(eq(task.parentTaskId, id)).orderBy(asc(task.createdAt)),
    db.select().from(tag).orderBy(asc(tag.name)),
    db.select({ tagId: taskTag.tagId }).from(taskTag).where(eq(taskTag.taskId, id)),
  ]);
  const attachedTagIds = attachedLinks.map((l) => l.tagId);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link href="/tasks" className="hover:underline">
            Tasks
          </Link>
          {proj && (
            <>
              {" / "}
              <Link href={`/projects/${proj.id}`} className="hover:underline">
                {proj.name}
              </Link>
            </>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        {t.notes && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.notes}</p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </h2>
        <TaskTagsEditor taskId={t.id} allTags={allTags} attachedTagIds={attachedTagIds} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Subtasks {subtasks.length > 0 && <span>({subtasks.length})</span>}
        </h2>
        <SubtaskAdd parentTaskId={t.id} />
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subtasks.</p>
        ) : (
          <div className="space-y-1">
            {subtasks.map((s) => (
              <TaskRow key={s.id} task={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
