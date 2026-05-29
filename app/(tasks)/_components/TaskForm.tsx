"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "../_actions/tasks";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { DateField } from "./DateField";
import type { RecurrenceRule, TaskStatus } from "@/db/schema/tasks";
import { taskStatusLabel } from "@/db/schema/tasks";

export type ProjectOption = { id: string; name: string };
export type PriorityOption = { id: string; name: string };

const statusOptions: TaskStatus[] = ["backlog", "in_progress", "waiting_for", "done", "canceled"];

export function TaskForm({
  projects,
  priorities,
  defaultProjectId,
  label = "New task",
}: {
  projects: ProjectOption[];
  priorities: PriorityOption[];
  defaultProjectId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId);
  const [priorityId, setPriorityId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [actionAt, setActionAt] = useState<Date | null>(null);
  const [actionWithTime, setActionWithTime] = useState(false);
  const [actionEndAt, setActionEndAt] = useState<Date | null>(null);
  const [showActionEnd, setShowActionEnd] = useState(false);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [dueWithTime, setDueWithTime] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setNotes("");
    setProjectId(defaultProjectId);
    setPriorityId(undefined);
    setStatus("backlog");
    setActionAt(null);
    setActionWithTime(false);
    setActionEndAt(null);
    setShowActionEnd(false);
    setDueAt(null);
    setDueWithTime(false);
    setRecurrence(null);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createTask({
        title: trimmed,
        notes: notes.trim() || undefined,
        projectId: projectId ?? undefined,
        priorityId: priorityId ?? undefined,
        status,
        actionAt: actionAt ?? undefined,
        actionEndAt: showActionEnd && actionEndAt ? actionEndAt : undefined,
        dueAt: dueAt ?? undefined,
        recurrence,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label>Action</Label>
              {!showActionEnd ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActionEnd(true)}
                >
                  + End date
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowActionEnd(false);
                    setActionEndAt(null);
                  }}
                >
                  <X className="h-3 w-3" /> End
                </Button>
              )}
            </div>
            <DateField
              value={actionAt}
              onChange={setActionAt}
              withTime={actionWithTime}
              onToggleTime={setActionWithTime}
            />
            {showActionEnd && (
              <DateField
                value={actionEndAt}
                onChange={setActionEndAt}
                withTime={actionWithTime}
                onToggleTime={setActionWithTime}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due</Label>
            <DateField
              value={dueAt}
              onChange={setDueAt}
              withTime={dueWithTime}
              onToggleTime={setDueWithTime}
              id="task-due"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {taskStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priorityId ?? "none"}
                onValueChange={(v) => setPriorityId(v === "none" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId ?? "none"}
              onValueChange={(v) => setProjectId(v === "none" ? undefined : v)}
            >
              <SelectTrigger>
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
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} dueAt={dueAt} />
          <DialogFooter>
            <Button type="submit" disabled={pending || !title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
