"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@/db/schema/tasks";

export type CalendarItem = {
  id: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  kind: "due" | "action";
  dateISO: string;
  hasTime: boolean;
};

type ViewMode = "week" | "month";

const weekStartsOn = 1;

const statusDot: Record<TaskStatus, string> = {
  backlog: "bg-slate-400",
  in_progress: "bg-blue-500",
  waiting_for: "bg-amber-500",
  canceled: "bg-zinc-300",
  done: "bg-green-500",
};

export function CalendarView({ items }: { items: CalendarItem[] }) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn });
    const out: Date[] = [];
    let d = start;
    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [view, cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const k = format(new Date(it.dateISO), "yyyy-MM-dd");
      const list = map.get(k) ?? [];
      list.push(it);
      map.set(k, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }
    return map;
  }, [items]);

  function shift(dir: -1 | 1) {
    setCursor((c) => (view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));
  }

  const title =
    view === "week"
      ? `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`
      : format(cursor, "MMMM yyyy");

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(startOfWeek(new Date(), { weekStartsOn }), i), "EEE"),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">{title}</span>
        </div>
        <div className="inline-flex rounded-md border bg-card p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`rounded px-3 py-1 ${
              view === "week" ? "bg-accent text-foreground" : "text-foreground/70"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`rounded px-3 py-1 ${
              view === "month" ? "bg-accent text-foreground" : "text-foreground/70"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-sm">
        {weekdayLabels.map((d) => (
          <div key={d} className="bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const muted = view === "month" && !isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={`min-h-[110px] bg-card p-1.5 ${muted ? "opacity-50" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-xs ${
                    today
                      ? "rounded bg-blue-600 px-1.5 py-0.5 font-semibold text-white"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayItems.length}</span>
                )}
              </div>
              <ul className="space-y-0.5">
                {dayItems.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={`/tasks/${it.taskId}`}
                      title={`${it.title} (${it.kind})`}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-accent ${
                        it.status === "done" || it.status === "canceled"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status]}`} />
                      {it.hasTime && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(it.dateISO), "HH:mm")}
                        </span>
                      )}
                      <span className="truncate">{it.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
