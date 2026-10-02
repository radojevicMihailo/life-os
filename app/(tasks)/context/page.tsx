import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { context, taskContext } from "@/db/schema/tasks";
import { TASK_PRIORITIES } from "@/lib/task-priorities";
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
        <h1 className="text-2xl font-semibold tracking-tight">Konteksti i prioriteti</h1>
        <p className="text-sm text-muted-foreground">Konteksti su podesivi. Prioriteti su četiri stalna kvadranta.</p>
      </header>
      <section aria-labelledby="priorities-heading" className="space-y-3">
        <h2 id="priorities-heading" className="text-lg font-semibold">Prioriteti</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TASK_PRIORITIES.map((p) => <div key={p.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-3"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} /><h3 className="font-medium">{p.name}</h3></div>
            <p className="mt-2 text-sm text-muted-foreground">{[
              "Uradi prvo: važno je i zahteva brzu reakciju.",
              "Zakaži: izdvoji vreme za ono što dugoročno znači.",
              "Delegiraj ili skrati: hitno je, ali ne vodi glavnim ciljevima.",
              "Preispitaj: odloži ili ukloni ako nema vrednost.",
            ][p.rank - 1]}</p>
          </div>)}
        </div>
      </section>
      <section className="space-y-3" aria-labelledby="contexts-heading">
      <h2 id="contexts-heading" className="text-lg font-semibold">Konteksti <span className="text-sm font-normal text-muted-foreground">({contexts.length})</span></h2>
      <ContextForm />
      {contexts.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Još nema konteksta. Dodaj prvi iznad.
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
      </section>
    </div>
  );
}
