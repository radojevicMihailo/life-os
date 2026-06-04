"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Goal, GoalStatus } from "@/db/schema/goals";
import { goalStatusLabel } from "@/db/schema/goals";
import { deleteGoal, setGoalStatus } from "../_actions/goals";
import { formatTaskDate } from "@/lib/format";
import { isBefore, startOfDay } from "date-fns";

export type GoalWithProgress = Goal & {
  milestonesTotal: number;
  milestonesDone: number;
};

const statusOrder: GoalStatus[] = ["active", "done", "paused", "canceled"];

const statusBadgeStyle: Record<GoalStatus, string> = {
  active: "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-amber-100 text-amber-800 border-amber-300",
  canceled: "bg-zinc-100 text-zinc-500 border-zinc-300 line-through",
};

export function GoalRow({ goal }: { goal: GoalWithProgress }) {
  const [pending, startTransition] = useTransition();

  const target = goal.targetDate
    ? goal.targetDate instanceof Date
      ? goal.targetDate
      : new Date(goal.targetDate)
    : null;
  const completed = goal.status === "done";
  const overdue = target ? isBefore(target, startOfDay(new Date())) && !completed : false;
  const pct =
    goal.milestonesTotal > 0
      ? Math.round((goal.milestonesDone / goal.milestonesTotal) * 100)
      : 0;

  function changeStatus(s: GoalStatus) {
    startTransition(async () => {
      const r = await setGoalStatus(goal.id, s);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteGoal(goal.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="group flex flex-col gap-2 rounded-md border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/goals/${goal.id}`}
          className={`flex-1 min-w-0 text-sm font-medium hover:underline ${
            completed || goal.status === "canceled" ? "text-muted-foreground line-through" : ""
          }`}
        >
          {goal.title}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`rounded border px-2 py-0.5 text-xs ${statusBadgeStyle[goal.status]}`}
              disabled={pending}
            >
              {goalStatusLabel[goal.status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statusOrder.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                {goalStatusLabel[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {target && (
          <Badge
            variant="outline"
            className={`gap-1 text-xs ${overdue ? "border-red-500 text-red-600" : ""}`}
            title="Target date"
          >
            <Calendar className="h-3 w-3" />
            {formatTaskDate(target)}
          </Badge>
        )}
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {goal.milestonesDone}/{goal.milestonesTotal} · {pct}%
        </span>
      </div>
    </div>
  );
}
