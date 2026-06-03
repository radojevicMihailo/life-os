"use client";

import { useEffect, useMemo, useState } from "react";
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
  endISO?: string;
  hasTime: boolean;
};

const HOUR_PX = 32;
const DAY_PX = HOUR_PX * 24;

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
  const [view, setView] = useState<ViewMode>("week");
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

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-sm">
          {weekdayLabels.map((d) => (
            <div
              key={d}
              className="bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayItems = byDay.get(key) ?? [];
            const muted = !isSameMonth(day, cursor);
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
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status]}`}
                        />
                        {it.hasTime && (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {format(new Date(it.dateISO), "HHmm")}
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
      ) : (
        <WeekTimeline days={days} byDay={byDay} />
      )}
    </div>
  );
}

function WeekTimeline({
  days,
  byDay,
}: {
  days: Date[];
  byDay: Map<string, CalendarItem[]>;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const today = now;
  const todayIdx = days.findIndex((d) => isSameDay(d, today));
  const nowTop = ((today.getHours() * 60 + today.getMinutes()) / 60) * HOUR_PX;

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div
        className="grid border-b bg-muted/40"
        style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
      >
        <div className="px-2 py-1 text-[10px] text-muted-foreground">All-day</div>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={`h-${format(day, "yyyy-MM-dd")}`}
              className="border-l px-2 py-1 text-xs font-medium"
            >
              <div className="text-muted-foreground">{format(day, "EEE")}</div>
              <div
                className={
                  isToday
                    ? "inline-block rounded bg-blue-600 px-1.5 font-semibold text-white"
                    : "font-semibold"
                }
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid border-b"
        style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
      >
        <div className="bg-muted/20" />
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const allDay = dayItems.filter((i) => !i.hasTime);
          return (
            <div key={`ad-${key}`} className="min-h-[28px] border-l p-1">
              <ul className="space-y-0.5">
                {allDay.map((it) => (
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
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status]}`}
                      />
                      <span className="truncate">{it.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div
        className="relative grid"
        style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))`, height: DAY_PX }}
      >
        <div className="relative">
          {hours.map((h) => {
            const label = `${h.toString().padStart(2, "0")}00`;
            const isFirst = h === 0;
            return (
              <div
                key={h}
                className="absolute right-1 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: isFirst ? 0 : h * HOUR_PX, transform: isFirst ? undefined : "translateY(-50%)" }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const timed = dayItems.filter((i) => i.hasTime);
          const isToday = idx === todayIdx;
          return (
            <div key={`t-${key}`} className="relative border-l">
              {isToday && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                  style={{ top: nowTop }}
                >
                  <span className="absolute -left-1 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
              )}
              {hours.map((h) => (
                <div key={`hr-${h}`}>
                  <div
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: h * HOUR_PX }}
                  />
                  <div
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ top: h * HOUR_PX + HOUR_PX / 2 }}
                  />
                </div>
              ))}
              {timed.map((it) => {
                const start = new Date(it.dateISO);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const end = it.endISO ? new Date(it.endISO) : null;
                const endMin = end
                  ? Math.min(24 * 60, end.getHours() * 60 + end.getMinutes() || 24 * 60)
                  : startMin + 30;
                const top = (startMin / 60) * HOUR_PX;
                const height = Math.max(16, ((endMin - startMin) / 60) * HOUR_PX);
                const muted = it.status === "done" || it.status === "canceled";
                return (
                  <Link
                    key={it.id}
                    href={`/tasks/${it.taskId}`}
                    title={`${it.title} (${it.kind})`}
                    className={`absolute left-1 right-1 overflow-hidden rounded border bg-card px-1 py-0.5 text-[11px] leading-tight hover:bg-accent ${
                      muted ? "text-muted-foreground line-through" : ""
                    }`}
                    style={{ top, height }}
                  >
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status]}`}
                      />
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {format(start, "HHmm")}
                      </span>
                    </span>
                    <span className="block truncate">{it.title}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
