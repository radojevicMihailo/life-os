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
import { CreateTaskDialog, type CreateTaskDialogInitial } from "./CreateTaskDialog";

export type CalendarItem = {
  id: string;
  taskId: string | null;
  title: string;
  status: TaskStatus | null;
  kind: "due" | "action" | "gcal";
  source?: "task" | "google";
  dateISO: string;
  endISO?: string;
  hasTime: boolean;
};

function isGcal(it: CalendarItem) {
  return it.source === "google" || it.kind === "gcal";
}

const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const ACTIVE_HOUR_PX = 56;

function hourPx(h: number) {
  return h >= ACTIVE_START_HOUR && h < ACTIVE_END_HOUR ? ACTIVE_HOUR_PX : 0;
}

const HOUR_TOPS: number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (let h = 0; h < 24; h++) {
    out.push(acc);
    acc += hourPx(h);
  }
  out.push(acc);
  return out;
})();
const DAY_PX = HOUR_TOPS[24];

function minutesToPx(minutes: number) {
  const m = Math.max(0, Math.min(24 * 60, minutes));
  const h = Math.min(23, Math.floor(m / 60));
  return HOUR_TOPS[h] + ((m - h * 60) / 60) * hourPx(h);
}

function pxToMinutes(y: number) {
  if (y <= 0) return 0;
  if (y >= DAY_PX) return 24 * 60;
  let h = 0;
  while (h < 23 && HOUR_TOPS[h + 1] <= y) h++;
  const within = ((y - HOUR_TOPS[h]) / hourPx(h)) * 60;
  return h * 60 + within;
}

type ViewMode = "week" | "month";

const weekStartsOn = 1;

const statusDot: Record<TaskStatus, string> = {
  backlog: "bg-slate-400",
  in_progress: "bg-blue-500",
  waiting_for: "bg-amber-500",
  canceled: "bg-zinc-300",
  done: "bg-green-500",
};

export function CalendarView({
  items,
  toolbarExtras,
}: {
  items: CalendarItem[];
  toolbarExtras?: React.ReactNode;
}) {
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<CreateTaskDialogInitial | null>(null);

  function openCreate(date: Date, withTime: boolean) {
    setDialogInitial({ date, withTime });
    setDialogOpen(true);
  }

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
          {toolbarExtras}
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
                onClick={() => openCreate(day, false)}
                className={`min-h-[110px] cursor-pointer bg-card p-1.5 hover:bg-accent/40 ${
                  muted ? "opacity-50" : ""
                }`}
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
                  {dayItems.map((it) =>
                    isGcal(it) ? (
                      <li key={it.id} onClick={(e) => e.stopPropagation()}>
                        <div
                          title={it.title}
                          className="flex items-center gap-1 truncate rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                        >
                          {it.hasTime && (
                            <span className="text-[10px] tabular-nums">
                              {format(new Date(it.dateISO), "HHmm")}
                            </span>
                          )}
                          <span className="truncate">{it.title}</span>
                        </div>
                      </li>
                    ) : (
                      <li key={it.id} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/tasks/${it.taskId!}`}
                          title={`${it.title} (${it.kind})`}
                          className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-accent ${
                            it.status === "done" || it.status === "canceled"
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status!]}`}
                          />
                          {it.hasTime && (
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {format(new Date(it.dateISO), "HHmm")}
                            </span>
                          )}
                          <span className="truncate">{it.title}</span>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <WeekTimeline days={days} byDay={byDay} onCreate={openCreate} />
      )}

      <CreateTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={dialogInitial} />
    </div>
  );
}

function WeekTimeline({
  days,
  byDay,
  onCreate,
}: {
  days: Date[];
  byDay: Map<string, CalendarItem[]>;
  onCreate: (date: Date, withTime: boolean) => void;
}) {
  const hours = Array.from(
    { length: ACTIVE_END_HOUR - ACTIVE_START_HOUR },
    (_, i) => ACTIVE_START_HOUR + i,
  );
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const today = now;
  const todayIdx = days.findIndex((d) => isSameDay(d, today));
  const nowTop = minutesToPx(today.getHours() * 60 + today.getMinutes());

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
            <div
              key={`ad-${key}`}
              onClick={() => onCreate(day, false)}
              className="min-h-[28px] cursor-pointer border-l p-1 hover:bg-accent/40"
            >
              <ul className="space-y-0.5">
                {allDay.map((it) =>
                  isGcal(it) ? (
                    <li key={it.id} onClick={(e) => e.stopPropagation()}>
                      <div
                        title={it.title}
                        className="truncate rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                      >
                        {it.title}
                      </div>
                    </li>
                  ) : (
                    <li key={it.id} onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/tasks/${it.taskId!}`}
                        title={`${it.title} (${it.kind})`}
                        className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-accent ${
                          it.status === "done" || it.status === "canceled"
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status!]}`}
                        />
                        <span className="truncate">{it.title}</span>
                      </Link>
                    </li>
                  ),
                )}
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
          {[...hours, ACTIVE_END_HOUR].map((h) => {
            const label = `${h.toString().padStart(2, "0")}00`;
            const isFirst = h === ACTIVE_START_HOUR;
            const isLast = h === ACTIVE_END_HOUR;
            const top = isFirst ? 0 : isLast ? DAY_PX : HOUR_TOPS[h];
            return (
              <div
                key={h}
                className="absolute right-1 text-[10px] tabular-nums text-muted-foreground"
                style={{
                  top,
                  transform: isFirst ? undefined : isLast ? "translateY(-100%)" : "translateY(-50%)",
                }}
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
            <div
              key={`t-${key}`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const raw = pxToMinutes(y);
                const minutes = Math.max(0, Math.min(24 * 60 - 15, Math.round(raw / 15) * 15));
                const d = new Date(day);
                d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
                onCreate(d, true);
              }}
              className="relative cursor-pointer border-l hover:bg-accent/20"
            >
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
                    style={{ top: HOUR_TOPS[h] }}
                  />
                  <div
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ top: HOUR_TOPS[h] + hourPx(h) / 2 }}
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
                const top = minutesToPx(startMin);
                const height = Math.max(16, minutesToPx(endMin) - top);
                if (isGcal(it)) {
                  return (
                    <div
                      key={it.id}
                      onClick={(e) => e.stopPropagation()}
                      title={`${format(start, "HH:mm")} ${it.title}`}
                      className="absolute left-1 right-1 flex items-start gap-1 overflow-hidden rounded border border-slate-300 bg-slate-200 px-1 py-0.5 text-[11px] leading-tight text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                      style={{ top, height: Math.max(20, height) }}
                    >
                      <span className="shrink-0 text-[10px] tabular-nums opacity-70">
                        {format(start, "HH:mm")}
                      </span>
                      <span className="truncate font-medium">{it.title}</span>
                    </div>
                  );
                }
                const muted = it.status === "done" || it.status === "canceled";
                return (
                  <Link
                    key={it.id}
                    onClick={(e) => e.stopPropagation()}
                    href={`/tasks/${it.taskId!}`}
                    title={`${it.title} (${it.kind})`}
                    className={`absolute left-1 right-1 overflow-hidden rounded border bg-card px-1 py-0.5 text-[11px] leading-tight hover:bg-accent ${
                      muted ? "text-muted-foreground line-through" : ""
                    }`}
                    style={{ top, height }}
                  >
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[it.status!]}`}
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
