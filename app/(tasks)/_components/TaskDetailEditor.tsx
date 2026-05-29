"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskStatus } from "@/db/schema/tasks";
import { taskStatusLabel } from "@/db/schema/tasks";
import { setTaskStatus, updateTask } from "../_actions/tasks";
import { DateField } from "./DateField";

const statusOrder: TaskStatus[] = ["backlog", "in_progress", "waiting_for", "done", "canceled"];

const statusBadgeStyle: Record<TaskStatus, string> = {
  backlog: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  waiting_for: "bg-amber-100 text-amber-800 border-amber-300",
  canceled: "bg-zinc-100 text-zinc-500 border-zinc-300",
  done: "bg-green-100 text-green-700 border-green-300",
};

function hasTimeComponent(d: Date | null): boolean {
  if (!d) return false;
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
}

export function TaskDetailEditor({
  taskId,
  status: initialStatus,
  actionAt: initialAction,
  actionEndAt: initialActionEnd,
  dueAt: initialDue,
}: {
  taskId: string;
  status: TaskStatus;
  actionAt: Date | null;
  actionEndAt: Date | null;
  dueAt: Date | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [actionAt, setActionAt] = useState(initialAction);
  const [actionEndAt, setActionEndAt] = useState(initialActionEnd);
  const [dueAt, setDueAt] = useState(initialDue);
  const [actionWithTime, setActionWithTime] = useState(
    hasTimeComponent(initialAction) || hasTimeComponent(initialActionEnd),
  );
  const [dueWithTime, setDueWithTime] = useState(hasTimeComponent(initialDue));
  const [pending, startTransition] = useTransition();

  function changeStatus(s: TaskStatus) {
    const prev = status;
    setStatus(s);
    startTransition(async () => {
      const r = await setTaskStatus(taskId, s);
      if (!r.ok) {
        toast.error(r.error);
        setStatus(prev);
      }
    });
  }

  function patch(fields: { actionAt?: Date | null; actionEndAt?: Date | null; dueAt?: Date | null }) {
    startTransition(async () => {
      const r = await updateTask({ id: taskId, ...fields });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-4 rounded-md border bg-card p-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Status</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full rounded border px-3 py-2 text-sm text-left ${statusBadgeStyle[status]}`}
              disabled={pending}
            >
              {taskStatusLabel[status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusOrder.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                {taskStatusLabel[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label>Action date</Label>
        <DateField
          value={actionAt}
          withTime={actionWithTime}
          onToggleTime={setActionWithTime}
          onChange={(d) => {
            setActionAt(d);
            patch({ actionAt: d });
          }}
        />
        {actionAt && (
          <DateField
            value={actionEndAt}
            withTime={actionWithTime}
            onToggleTime={setActionWithTime}
            onChange={(d) => {
              setActionEndAt(d);
              patch({ actionEndAt: d });
            }}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Due date</Label>
        <DateField
          value={dueAt}
          withTime={dueWithTime}
          onToggleTime={setDueWithTime}
          onChange={(d) => {
            setDueAt(d);
            patch({ dueAt: d });
          }}
        />
      </div>
    </div>
  );
}
