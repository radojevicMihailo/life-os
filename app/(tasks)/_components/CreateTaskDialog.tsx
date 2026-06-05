"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTask } from "../_actions/tasks";
import { DateField } from "./DateField";

export type CreateTaskDialogInitial = {
  date: Date;
  withTime: boolean;
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CreateTaskDialogInitial | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [withTime, setWithTime] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && initial) {
      setTitle("");
      setDueAt(initial.date);
      setWithTime(initial.withTime);
    }
  }, [open, initial]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createTask({ title: trimmed, dueAt: dueAt ?? undefined });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Task created");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label>Due</Label>
            <DateField
              value={dueAt}
              onChange={setDueAt}
              withTime={withTime}
              onToggleTime={setWithTime}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
