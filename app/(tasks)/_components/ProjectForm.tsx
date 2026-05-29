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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "../_actions/projects";
import { DateField } from "./DateField";
import type { ProjectStatus } from "@/db/schema/tasks";
import { projectStatusLabel } from "@/db/schema/tasks";

const statusOptions: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "canceled"];

export function ProjectForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [startWithTime, setStartWithTime] = useState(false);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [dueWithTime, setDueWithTime] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setStatus("active");
    setStartAt(null);
    setStartWithTime(false);
    setDueAt(null);
    setDueWithTime(false);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createProject({
        name: trimmed,
        status,
        startAt: startAt ?? undefined,
        dueAt: dueAt ?? undefined,
      });
      if (r.ok) {
        reset();
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {projectStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <DateField
                value={startAt}
                onChange={setStartAt}
                withTime={startWithTime}
                onToggleTime={setStartWithTime}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due</Label>
              <DateField
                value={dueAt}
                onChange={setDueAt}
                withTime={dueWithTime}
                onToggleTime={setDueWithTime}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
