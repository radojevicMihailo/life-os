import { asc, desc, eq, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { goal, milestone, type GoalStatus } from "@/db/schema/goals";
import { GoalQuickAdd } from "./_components/GoalQuickAdd";
import { GoalRow, type GoalWithProgress } from "./_components/GoalRow";
import { GoalsStatusFilter } from "./_components/GoalsStatusFilter";

export const dynamic = "force-dynamic";

const VALID_STATUSES: GoalStatus[] = ["active", "done", "paused", "canceled"];

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusParam = sp.status;
  const filter: GoalStatus | "all" =
    statusParam === "all"
      ? "all"
      : VALID_STATUSES.includes(statusParam as GoalStatus)
        ? (statusParam as GoalStatus)
        : "active";

  const rows = await db
    .select({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      targetDate: goal.targetDate,
      sortOrder: goal.sortOrder,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      milestonesTotal: count(milestone.id).as("milestones_total"),
      milestonesDone: sql<number>`COUNT(${milestone.id}) FILTER (WHERE ${milestone.doneAt} IS NOT NULL)`.as(
        "milestones_done",
      ),
    })
    .from(goal)
    .leftJoin(milestone, eq(milestone.goalId, goal.id))
    .where(filter === "all" ? undefined : eq(goal.status, filter))
    .groupBy(goal.id)
    .orderBy(asc(goal.status), asc(goal.targetDate), desc(goal.createdAt));

  const goals: GoalWithProgress[] = rows.map((r) => ({
    ...r,
    milestonesTotal: Number(r.milestonesTotal),
    milestonesDone: Number(r.milestonesDone),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <GoalQuickAdd />
        <GoalsStatusFilter />
      </header>
      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals yet.</p>
        ) : (
          goals.map((g) => <GoalRow key={g.id} goal={g} />)
        )}
      </div>
    </div>
  );
}
