import { asc, desc, eq, and, count, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  goal,
  milestone,
  type GoalStatus,
  type GoalHorizon,
  goalHorizonOrder,
} from "@/db/schema/goals";
import { GoalQuickAdd } from "./_components/GoalQuickAdd";
import { GoalRow, type GoalWithProgress } from "./_components/GoalRow";
import { GoalsStatusFilter } from "./_components/GoalsStatusFilter";
import { GoalsHorizonTabs } from "./_components/GoalsHorizonTabs";

export const dynamic = "force-dynamic";

const VALID_STATUSES: GoalStatus[] = ["active", "done", "paused", "canceled"];
const VALID_HORIZONS: GoalHorizon[] = [...goalHorizonOrder];

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; horizon?: string }>;
}) {
  const sp = await searchParams;
  const statusParam = sp.status;
  const filter: GoalStatus | "all" =
    statusParam === "all"
      ? "all"
      : VALID_STATUSES.includes(statusParam as GoalStatus)
        ? (statusParam as GoalStatus)
        : "active";

  const horizonParam = sp.horizon;
  const horizon: GoalHorizon = VALID_HORIZONS.includes(horizonParam as GoalHorizon)
    ? (horizonParam as GoalHorizon)
    : "yearly";

  const statusWhere = filter === "all" ? undefined : eq(goal.status, filter);

  const rows = await db
    .select({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      horizon: goal.horizon,
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
    .where(and(eq(goal.horizon, horizon), statusWhere))
    .groupBy(goal.id)
    .orderBy(asc(goal.status), asc(goal.targetDate), desc(goal.createdAt));

  const goals: GoalWithProgress[] = rows.map((r) => ({
    ...r,
    milestonesTotal: Number(r.milestonesTotal),
    milestonesDone: Number(r.milestonesDone),
  }));

  const countRows = await db
    .select({ horizon: goal.horizon, n: count(goal.id) })
    .from(goal)
    .where(statusWhere)
    .groupBy(goal.horizon);
  const counts: Record<GoalHorizon, number> = {
    yearly: 0,
    monthly: 0,
    weekly: 0,
    daily: 0,
  };
  for (const r of countRows) counts[r.horizon] = Number(r.n);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <GoalQuickAdd defaultHorizon={horizon} />
        <GoalsStatusFilter />
      </header>
      <GoalsHorizonTabs counts={counts} />
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
