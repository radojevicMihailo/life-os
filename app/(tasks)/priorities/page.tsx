import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { priority, task } from "@/db/schema/tasks";
import { PriorityForm } from "../_components/PriorityForm";
import { PriorityRow } from "../_components/PriorityRow";

export const dynamic = "force-dynamic";

export default async function PrioritiesPage() {
  const priorities = await db
    .select({
      id: priority.id,
      name: priority.name,
      color: priority.color,
      taskCount: sql<number>`(SELECT COUNT(*) FROM ${task} WHERE ${task.priorityId} = ${priority.id})`,
    })
    .from(priority)
    .orderBy(asc(priority.name));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Priorities</h1>
        <p className="text-sm text-muted-foreground">{priorities.length} total</p>
      </header>
      <PriorityForm />
      {priorities.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          No priorities yet.
        </div>
      ) : (
        <div className="space-y-1">
          {priorities.map((p) => (
            <PriorityRow
              key={p.id}
              id={p.id}
              name={p.name}
              color={p.color}
              taskCount={Number(p.taskCount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
