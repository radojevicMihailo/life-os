"use client";

import { taskPriorityLabel } from "@/lib/task-priorities";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X, Repeat, Calendar, PlayCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, TaskStatus } from "@/db/schema/tasks";
import { taskStatusLabel } from "@/db/schema/tasks";
import { deleteTask, updateTask, setTaskStatus } from "../_actions/tasks";
import { formatTaskDate, formatDateRange } from "@/lib/format";
import { isBefore, startOfDay } from "date-fns";
import { taskStatusColors } from "@/lib/status-colors";

export type TaskWithMeta = Task & {
  projectName?: string | null;
  priorityName?: string | null;
  priorityColor?: string | null;
  contexts?: { id: string; name: string; color: string | null }[];
};

const statusOrder: TaskStatus[] = ["backlog", "in_progress", "waiting_for", "done", "canceled"];

export function TaskRow({ task }: { task: TaskWithMeta }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [pending, startTransition] = useTransition();

  const completed = task.status === "done";
  const due = task.dueAt ? (task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt)) : null;
  const action = task.actionAt
    ? task.actionAt instanceof Date
      ? task.actionAt
      : new Date(task.actionAt)
    : null;
  const actionEnd = task.actionEndAt
    ? task.actionEndAt instanceof Date
      ? task.actionEndAt
      : new Date(task.actionEndAt)
    : null;
  const overdue = due ? isBefore(due, startOfDay(new Date())) && !completed : false;

  function changeStatus(s: TaskStatus) {
    startTransition(async () => {
      const r = await setTaskStatus(task.id, s);
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
    <div className="group flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card shadow-sm px-3 py-2">
      {task.priorityName && (
        <Badge
          variant="outline"
          className="text-xs"
          style={
            task.priorityColor
              ? { backgroundColor: task.priorityColor, color: "white", borderColor: task.priorityColor }
              : undefined
          }
          title={`Prioritet: ${taskPriorityLabel(task.priorityName)}`}
        >
          {taskPriorityLabel(task.priorityName)}
        </Badge>
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
          className="h-8 flex-1"
        />
      ) : (
        <Link
          href={`/tasks/${task.id}`}
          className={`flex-1 min-w-0 text-sm hover:underline ${
            completed || task.status === "canceled" ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${taskStatusColors[task.status]}`}
            disabled={pending}
          >
            {taskStatusLabel[task.status]}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOrder.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
              {taskStatusLabel[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {action && (
        <Badge variant="outline" className="gap-1 text-xs" title="Action date">
          <PlayCircle className="h-3 w-3" />
          {formatDateRange(action, actionEnd)}
        </Badge>
      )}
      {due && (
        <Badge
          variant="outline"
          className={`gap-1 text-xs ${overdue ? "border-red-500 text-red-600" : ""}`}
          title="Due date"
        >
          <Calendar className="h-3 w-3" />
          {formatTaskDate(due)}
        </Badge>
      )}
      {task.recurrence && (
        <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recurring" />
      )}
      {task.contexts && task.contexts.length > 0 && (
        <div className="flex items-center gap-1">
          {task.contexts.map((c) => (
            <Badge
              key={c.id}
              variant="outline"
              className="text-xs"
              style={
                c.color ? { backgroundColor: c.color, color: "white", borderColor: c.color } : undefined
              }
            >
              {c.name}
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
