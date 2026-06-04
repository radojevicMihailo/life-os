"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Habit } from "@/db/schema/habits";
import {
  habitCadenceLabel,
  habitKindLabel,
} from "@/db/schema/habits";
import { archiveHabit, deleteHabit, unarchiveHabit } from "../_actions/habits";

export function HabitManageRow({ habit }: { habit: Habit }) {
  const [pending, startTransition] = useTransition();
  const archived = !!habit.archivedAt;

  function toggleArchive() {
    startTransition(async () => {
      const r = archived ? await unarchiveHabit(habit.id) : await archiveHabit(habit.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    if (!confirm(`Delete habit "${habit.title}"? All logs will be lost.`)) return;
    startTransition(async () => {
      const r = await deleteHabit(habit.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${archived ? "text-muted-foreground line-through" : ""}`}>
          {habit.title}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{habitKindLabel[habit.kind]}</Badge>
          <Badge variant="outline" className="text-xs">{habitCadenceLabel[habit.cadence]}</Badge>
          {habit.kind === "count" ? (
            <span>target {habit.targetCount}{habit.unit ? ` ${habit.unit}` : ""}/day</span>
          ) : null}
          {habit.cadence === "weekly_target" ? <span>{habit.weeklyTarget}×/week</span> : null}
        </div>
      </div>
      <Button asChild size="icon" variant="ghost" className="h-8 w-8">
        <Link href={`/habits/${habit.id}/edit`} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={toggleArchive}
        disabled={pending}
        aria-label={archived ? "Unarchive" : "Archive"}
      >
        {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive"
        onClick={remove}
        disabled={pending}
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
