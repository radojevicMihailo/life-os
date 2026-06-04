"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoalStatus } from "@/db/schema/goals";
import { goalStatusLabel } from "@/db/schema/goals";
import { setGoalStatus, updateGoal } from "../_actions/goals";
import { DateField } from "@/app/(tasks)/_components/DateField";

const statusOrder: GoalStatus[] = ["active", "done", "paused", "canceled"];

const statusBadgeStyle: Record<GoalStatus, string> = {
  active: "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-amber-100 text-amber-800 border-amber-300",
  canceled: "bg-zinc-100 text-zinc-500 border-zinc-300",
};

export function GoalDetailEditor({
  goalId,
  status: initialStatus,
  targetDate: initialTarget,
  description: initialDescription,
}: {
  goalId: string;
  status: GoalStatus;
  targetDate: Date | null;
  description: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [targetDate, setTargetDate] = useState(initialTarget);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [pending, startTransition] = useTransition();

  function changeStatus(s: GoalStatus) {
    const prev = status;
    setStatus(s);
    startTransition(async () => {
      const r = await setGoalStatus(goalId, s);
      if (!r.ok) {
        toast.error(r.error);
        setStatus(prev);
      }
    });
  }

  function changeTarget(d: Date | null) {
    setTargetDate(d);
    startTransition(async () => {
      const r = await updateGoal({ id: goalId, targetDate: d });
      if (!r.ok) toast.error(r.error);
    });
  }

  function saveDescription() {
    const next = description.trim() || null;
    startTransition(async () => {
      const r = await updateGoal({ id: goalId, description: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-4 rounded-md border bg-card p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Status</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full rounded border px-3 py-2 text-sm text-left ${statusBadgeStyle[status]}`}
              disabled={pending}
            >
              {goalStatusLabel[status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusOrder.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                {goalStatusLabel[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label>Target date</Label>
        <DateField
          value={targetDate}
          withTime={false}
          onToggleTime={() => {}}
          onChange={changeTarget}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Why this goal matters, success criteria..."
          rows={3}
        />
      </div>
    </div>
  );
}
