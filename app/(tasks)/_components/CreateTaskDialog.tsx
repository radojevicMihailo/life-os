"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { TASK_PRIORITIES, taskPriorityLabel } from "@/lib/task-priorities";
import { createTask } from "../_actions/tasks";
import { DateField } from "./DateField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CreateTaskDialogInitial = {
  date: Date;
  withTime: boolean;
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  initial,
  contexts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CreateTaskDialogInitial | null;
  contexts: { id: string; name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [actionAt, setActionAt] = useState<Date | null>(null);
  const [actionWithTime, setActionWithTime] = useState(false);
  const [dueAt, setDueAt] = useState<Date | null>(initial?.date ?? null);
  const [withTime, setWithTime] = useState(initial?.withTime ?? false);
  const [contextId, setContextId] = useState("none");
  const [priorityId, setPriorityId] = useState("none");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createTask({ title: trimmed, priorityId: priorityId === "none" ? undefined : priorityId as typeof TASK_PRIORITIES[number]["id"], actionAt: actionAt ?? undefined, dueAt: dueAt ?? undefined, contextIds: contextId === "none" ? undefined : [contextId] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Zadatak je dodat");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novi zadatak</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-task-title">Naslov</Label>
            <Input
              id="new-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Šta treba uraditi?"
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-task-action">Termin rada</Label>
            <DateField
              id="calendar-task-action"
              value={actionAt}
              onChange={setActionAt}
              withTime={actionWithTime}
              onToggleTime={setActionWithTime}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-task-due">Rok</Label>
            <DateField
              id="calendar-task-due"
              disabled={pending}
              value={dueAt}
              onChange={setDueAt}
              withTime={withTime}
              onToggleTime={setWithTime}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-task-context">Kontekst</Label>
            <Select value={contextId} onValueChange={setContextId}>
              <SelectTrigger id="calendar-task-context" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Bez konteksta</SelectItem>{contexts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            {contexts.length === 0 ? <Link href="/context" className="text-sm text-primary hover:underline">Dodaj prvi kontekst</Link> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-task-priority">Prioritet</Label>
            <Select value={priorityId} onValueChange={setPriorityId}>
              <SelectTrigger id="calendar-task-priority" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Bez prioriteta</SelectItem>{TASK_PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id}>{taskPriorityLabel(p.name)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              Dodaj
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
