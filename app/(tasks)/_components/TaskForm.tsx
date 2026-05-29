"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import type { RecurrenceRule } from "@/db/schema/tasks";

export type ProjectOption = { id: string; name: string };

const priorityOptions = [
  { value: "0", label: "None" },
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
];

export function TaskForm({
  projects,
  defaultProjectId,
  label = "New task",
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId);
  const [priority, setPriority] = useState<string>("0");
  const [dueLocal, setDueLocal] = useState<string>("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setNotes("");
    setProjectId(defaultProjectId);
    setPriority("0");
    setDueLocal("");
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
        priority: Number(priority),
        dueAt: dueLocal ? new Date(dueLocal) : undefined,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
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
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
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
