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
import type { ProjectStatus } from "@/db/schema/tasks";
import { projectStatusLabel } from "@/db/schema/tasks";
import { updateProject } from "../_actions/projects";
import { DateField } from "./DateField";
import { projectStatusColors } from "@/lib/status-colors";

const statusOrder: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "canceled"];

function hasTimeComponent(d: Date | null): boolean {
  if (!d) return false;
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
}

export function ProjectDetailEditor({
  projectId,
  status: initialStatus,
  startAt: initialStart,
  dueAt: initialDue,
}: {
  projectId: string;
  status: ProjectStatus;
  startAt: Date | null;
  dueAt: Date | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [startAt, setStartAt] = useState(initialStart);
  const [dueAt, setDueAt] = useState(initialDue);
  const [startWithTime, setStartWithTime] = useState(hasTimeComponent(initialStart));
  const [dueWithTime, setDueWithTime] = useState(hasTimeComponent(initialDue));
  const [pending, startTransition] = useTransition();

  function patch(fields: { status?: ProjectStatus; startAt?: Date | null; dueAt?: Date | null }) {
    startTransition(async () => {
      const r = await updateProject({ id: projectId, ...fields });
      if (!r.ok) toast.error(r.error);
    });
  }

  function changeStatus(s: ProjectStatus) {
    const prev = status;
    setStatus(s);
    startTransition(async () => {
      const r = await updateProject({ id: projectId, status: s });
      if (!r.ok) {
        toast.error(r.error);
        setStatus(prev);
      }
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card shadow-sm p-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Status</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full rounded-xl border px-4 py-2.5 text-base font-semibold text-left shadow-sm ${projectStatusColors[status]}`}
              disabled={pending}
            >
              {projectStatusLabel[status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusOrder.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                {projectStatusLabel[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label>Start date</Label>
        <DateField
          value={startAt}
          withTime={startWithTime}
          onToggleTime={setStartWithTime}
          onChange={(d) => {
            setStartAt(d);
            patch({ startAt: d });
          }}
        />
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
