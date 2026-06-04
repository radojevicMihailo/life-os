"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Milestone } from "@/db/schema/goals";
import { deleteMilestone, toggleMilestone, updateMilestone } from "../_actions/milestones";
import { DateField } from "@/app/(tasks)/_components/DateField";
import { formatTaskDate } from "@/lib/format";
import { isBefore, startOfDay } from "date-fns";

export function MilestoneRow({ milestone: m }: { milestone: Milestone }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [pending, startTransition] = useTransition();

  const due = m.dueDate ? (m.dueDate instanceof Date ? m.dueDate : new Date(m.dueDate)) : null;
  const done = !!m.doneAt;
  const overdue = due ? isBefore(due, startOfDay(new Date())) && !done : false;

  function toggle() {
    startTransition(async () => {
      const r = await toggleMilestone(m.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteMilestone(m.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function saveEdit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(m.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateMilestone({ id: m.id, title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setTitle(m.title);
      }
      setEditing(false);
    });
  }

  function changeDue(d: Date | null) {
    startTransition(async () => {
      const r = await updateMilestone({ id: m.id, dueDate: d });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="group flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2">
      <Checkbox checked={done} onCheckedChange={toggle} disabled={pending} />
      {editing ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setTitle(m.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-8 flex-1"
        />
      ) : (
        <span className={`flex-1 min-w-0 text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
          {m.title}
        </span>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            <Calendar className="h-3 w-3" />
            {due ? (
              <span className={`text-xs ${overdue ? "text-red-600" : ""}`}>
                {formatTaskDate(due)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex items-center gap-2">
            <DateField value={due} withTime={false} onToggleTime={() => {}} onChange={changeDue} />
            {due && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => changeDue(null)}
                aria-label="Clear due date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {done && m.doneAt && (
        <Badge variant="outline" className="text-xs text-green-700 border-green-300">
          Done {formatTaskDate(m.doneAt instanceof Date ? m.doneAt : new Date(m.doneAt))}
        </Badge>
      )}
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" onClick={saveEdit} disabled={pending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setTitle(m.title);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
