"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import type { Task } from "@/db/schema/tasks";
import { toggleTask, deleteTask, updateTask } from "../_actions/tasks";
import { formatDueDate, priorityColor, priorityLabel } from "@/lib/format";
import { isBefore, startOfDay } from "date-fns";

export type TaskWithMeta = Task & {
  projectName?: string | null;
  tags?: { id: string; name: string; color: string | null }[];
};

export function TaskRow({ task }: { task: TaskWithMeta }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [pending, startTransition] = useTransition();

  const completed = task.completedAt != null;
  const due = task.dueAt ? (task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt)) : null;
  const overdue = due ? isBefore(due, startOfDay(new Date())) && !completed : false;

  function toggle() {
    startTransition(async () => {
      const r = await toggleTask(task.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteTask(task.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function saveEdit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateTask({ id: task.id, title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setTitle(task.title);
      }
      setEditing(false);
    });
  }

  return (
    <div className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <Checkbox
        checked={completed}
        onCheckedChange={toggle}
        disabled={pending}
        aria-label="Toggle complete"
      />
      {task.priority > 0 && (
        <span
          aria-label={`Priority ${priorityLabel[task.priority]}`}
          title={`Priority: ${priorityLabel[task.priority]}`}
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: priorityColor[task.priority] }}
        />
      )}
      {editing ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setTitle(task.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-8"
        />
      ) : (
        <Link
          href={`/tasks/${task.id}`}
          className={`flex-1 text-sm hover:underline ${
            completed ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </Link>
      )}
      {due && (
        <Badge
          variant="outline"
          className={`text-xs ${overdue ? "border-red-500 text-red-600" : ""}`}
        >
          {formatDueDate(due)}
        </Badge>
      )}
      {task.recurrence && (
        <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recurring" />
      )}
      {task.tags && task.tags.length > 0 && (
        <div className="flex items-center gap-1">
          {task.tags.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className="text-xs"
              style={t.color ? { backgroundColor: t.color, color: "white", borderColor: t.color } : undefined}
            >
              {t.name}
            </Badge>
          ))}
        </div>
      )}
      {task.projectName && (
        <Badge variant="secondary" className="text-xs">
          {task.projectName}
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
                setTitle(task.title);
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
