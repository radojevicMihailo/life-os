"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Habit } from "@/db/schema/habits";
import { upsertLog } from "../_actions/logs";
import { isoDate } from "@/lib/habits/date";
import { isScheduledOn } from "@/lib/habits/schedule";
import { dayProgress, metOnDay, type LogMap } from "@/lib/habits/stats";

export function HabitWeekGrid({
  habit,
  days,
  logs,
}: {
  habit: Habit;
  days: Date[];
  logs: LogMap;
}) {
  const [pending, startTransition] = useTransition();

  function toggleBinary(iso: string, current: number | undefined) {
    if (habit.kind !== "binary") return;
    const next = (current ?? 0) >= 1 ? 0 : 1;
    startTransition(async () => {
      const r = await upsertLog({ habitId: habit.id, date: iso, count: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{habit.title}</div>
      <div className="flex items-center gap-1">
        {days.map((d) => {
          const iso = isoDate(d);
          const c = logs.get(iso);
          const scheduled = isScheduledOn(habit, d, iso);
          const met = metOnDay(habit, c);
          const prog = dayProgress(habit, c);
          const isBinary = habit.kind === "binary";
          const clickable = isBinary && scheduled && !pending;
          const title = `${format(d, "EEE LLL d")}${
            c != null
              ? ` — ${c}${habit.kind === "count" ? `/${habit.targetCount}` : ""}`
              : ""
          }`;
          const base =
            "h-7 w-7 rounded-md border text-[10px] flex items-center justify-center";
          let cls: string;
          if (!scheduled) cls = "bg-muted/40 border-dashed text-muted-foreground/50";
          else if (met) cls = "bg-emerald-500 border-emerald-600 text-white";
          else if (prog > 0) cls = "bg-emerald-200 border-emerald-300 text-emerald-900";
          else cls = "bg-card border-border text-muted-foreground";

          return clickable ? (
            <button
              key={iso}
              type="button"
              title={title}
              onClick={() => toggleBinary(iso, c)}
              className={`${base} ${cls} transition hover:scale-105`}
            >
              {format(d, "d")}
            </button>
          ) : (
            <div key={iso} title={title} className={`${base} ${cls}`}>
              {format(d, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
