import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goal, milestone } from "@/db/schema/goals";
import { GoalEditableTitle } from "../_components/GoalEditableTitle";
import { GoalDetailEditor } from "../_components/GoalDetailEditor";
import { MilestoneAdd } from "../_components/MilestoneAdd";
import { MilestoneRow } from "../_components/MilestoneRow";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const g = await db.query.goal.findFirst({ where: eq(goal.id, id) });
  if (!g) notFound();

  const milestones = await db
    .select()
    .from(milestone)
    .where(eq(milestone.goalId, id))
    .orderBy(asc(milestone.doneAt), asc(milestone.dueDate), asc(milestone.createdAt));

  const total = milestones.length;
  const done = milestones.filter((m) => m.doneAt).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link href="/goals" className="hover:underline">
            Goals
          </Link>
        </div>
        <GoalEditableTitle id={g.id} value={g.title} />
      </header>

      <GoalDetailEditor
        goalId={g.id}
        status={g.status}
        horizon={g.horizon}
        targetDate={g.targetDate}
        description={g.description}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Milestones</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {done}/{total} · {pct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <MilestoneAdd goalId={g.id} />
        <div className="space-y-2">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones yet.</p>
          ) : (
            milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)
          )}
        </div>
      </section>
    </div>
  );
}
