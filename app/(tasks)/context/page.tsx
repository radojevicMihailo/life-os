import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { context, taskContext } from "@/db/schema/tasks";
import { ContextForm } from "../_components/ContextForm";
import { ContextRow } from "../_components/ContextRow";

export const dynamic = "force-dynamic";

export default async function ContextPage() {
  const contexts = await db
    .select({
      id: context.id,
      name: context.name,
      color: context.color,
      taskCount: sql<number>`(SELECT COUNT(*) FROM ${taskContext} WHERE ${taskContext.contextId} = ${context.id})`,
    })
    .from(context)
    .orderBy(asc(context.name));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Context</h1>
        <p className="text-sm text-muted-foreground">{contexts.length} total</p>
      </header>
      <ContextForm />
      {contexts.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          No contexts yet.
        </div>
      ) : (
        <div className="space-y-1">
          {contexts.map((c) => (
            <ContextRow
              key={c.id}
              id={c.id}
              name={c.name}
              color={c.color}
              taskCount={Number(c.taskCount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
