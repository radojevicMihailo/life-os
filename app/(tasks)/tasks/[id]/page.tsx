import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { context, project, task, taskContext } from "@/db/schema/tasks";
import { fetchTasks } from "@/lib/tasks-query";
import { TaskRow } from "../../_components/TaskRow";
import { SubtaskAdd } from "../../_components/SubtaskAdd";
import { TaskContextsEditor } from "../../_components/TaskContextsEditor";
import { TaskDetailEditor } from "../../_components/TaskDetailEditor";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const t = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!t) notFound();

  const [proj, subtasks, allContexts, attachedLinks] = await Promise.all([
    t.projectId
      ? db.query.project.findFirst({ where: eq(project.id, t.projectId) })
      : Promise.resolve(null),
    fetchTasks({ parentTaskId: id, status: "all", sort: "created" }),
    db.select().from(context).orderBy(asc(context.name)),
    db
      .select({ contextId: taskContext.contextId })
      .from(taskContext)
      .where(eq(taskContext.taskId, id)),
  ]);
  const attachedContextIds = attachedLinks.map((l) => l.contextId);

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

      <TaskDetailEditor
        taskId={t.id}
        status={t.status}
        actionAt={t.actionAt}
        actionEndAt={t.actionEndAt}
        dueAt={t.dueAt}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Context
        </h2>
        <TaskContextsEditor
          taskId={t.id}
          allContexts={allContexts}
          attachedContextIds={attachedContextIds}
        />
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
