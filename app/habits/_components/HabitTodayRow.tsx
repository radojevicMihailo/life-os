"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Flame, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Habit } from "@/db/schema/habits";
import { saveHabitCount } from "@/lib/habits/save-count";
import { upsertLog } from "../_actions/logs";

export function HabitTodayRow({
  habit,
  isoToday,
  count,
  streak,
  showStreak = true,
}: {
  habit: Habit;
  isoToday: string;
  count: number | undefined;
  streak: number;
  showStreak?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<number>(count ?? 0);

  const confirmed = useRef(count ?? 0);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);

  function save(next: number) {
    if (saving.current) return;
    saving.current = true;
    setError(null);
    setLocal(next);
    startTransition(async () => {
      const result = await saveHabitCount(confirmed.current, next, () => upsertLog({ habitId: habit.id, date: isoToday, count: next }));
      confirmed.current = result.count;
      setLocal(result.count);
      setError(result.error);
      saving.current = false;
      if (result.error) toast.error(result.error);
    });
  }

  const done =
    habit.kind === "binary"
      ? local >= 1
      : local >= habit.targetCount;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card shadow-sm px-3 py-2 ${
        done ? "opacity-90" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {habit.kind === "binary" ? (
          <Checkbox
            aria-label={`Označi naviku: ${habit.title}`}
            checked={done}
            disabled={pending}
            onCheckedChange={(v) => save(v ? 1 : 0)}
          />
        ) : null}
        <div className="min-w-0">
          <div className={`truncate text-sm font-medium ${done ? "line-through" : ""}`}>
            {habit.title}
          </div>
          {habit.description ? (
            <div className="truncate text-xs text-muted-foreground">{habit.description}</div>
          ) : null}
        </div>
      </div>

      {habit.kind === "count" && (
        <div className="flex items-center gap-1.5 text-xs">
          <Input
            aria-label={`Broj za naviku: ${habit.title}`}
            type="number"
            min={0}
            className="h-8 w-20"
            value={local}
            disabled={pending}
            onChange={(e) => setLocal(Number(e.target.value) || 0)}
            onBlur={() => {
              if (local !== confirmed.current) save(local);
            }}
          />
          <span className="text-muted-foreground tabular-nums">
            / {habit.targetCount}
            {habit.unit ? ` ${habit.unit}` : ""}
          </span>
        </div>
      )}

      {showStreak && <div
        className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
        title="Trenutni niz"
      >
        <Flame className="h-3 w-3 text-orange-500" />
        <span className="tabular-nums">{streak}</span>
      </div>}

      {error && <p role="alert" className="w-full text-xs text-destructive">{error}</p>}

      <Button asChild size="icon" variant="ghost" className="h-7 w-7">
        <Link href={`/habits/${habit.id}/edit`} aria-label="Uredi naviku">
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
