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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus } from "@/db/schema/tasks";
import { taskStatusLabel } from "@/db/schema/tasks";
import { setTaskStatus, updateTask } from "../_actions/tasks";
import { DateField } from "./DateField";
import { taskStatusColors } from "@/lib/status-colors";

const statusOrder: TaskStatus[] = ["backlog", "in_progress", "waiting_for", "done", "canceled"];

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
  projectId: initialProjectId,
  projects,
}: {
  taskId: string;
  status: TaskStatus;
  actionAt: Date | null;
  actionEndAt: Date | null;
  dueAt: Date | null;
  projectId: string | null;
  projects: { id: string; name: string }[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [actionAt, setActionAt] = useState(initialAction);
  const [actionEndAt, setActionEndAt] = useState(initialActionEnd);
  const [dueAt, setDueAt] = useState(initialDue);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
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

  function patch(fields: {
    actionAt?: Date | null;
    actionEndAt?: Date | null;
    dueAt?: Date | null;
    projectId?: string | null;
  }) {
    startTransition(async () => {
      const r = await updateTask({ id: taskId, ...fields });
      if (!r.ok) toast.error(r.error);
    });
  }

  function changeProject(v: string) {
    const next = v === "none" ? null : v;
    const prev = projectId;
    setProjectId(next);
    startTransition(async () => {
      const r = await updateTask({ id: taskId, projectId: next });
      if (!r.ok) {
        toast.error(r.error);
        setProjectId(prev);
      }
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card shadow-sm p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full rounded-xl border px-4 py-2.5 text-base font-semibold text-left ${taskStatusColors[status]}`}
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

      <div className="space-y-2">
        <Label>Project</Label>
        <Select value={projectId ?? "none"} onValueChange={changeProject}>
          <SelectTrigger className="w-full" disabled={pending}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
