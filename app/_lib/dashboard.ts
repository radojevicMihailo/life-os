import "server-only";

import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { habit, habitLog } from "@/db/schema/habits";
import { priority, task } from "@/db/schema/tasks";
import { isScheduledOn } from "@/lib/habits/schedule";
import { belgradeCalendarDate, belgradeDayBounds, belgradeDayKey } from "@/lib/day";
import { fetchGoogleEventsAction } from "@/app/(tasks)/_actions/google";
import { listGoals } from "@/modules/finance/read-models/goals";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { assembleTodayPlan } from "./dashboard-model";

export async function loadDashboardHabits(now: Date) {
  const dayKey = belgradeDayKey(now);
  const [habits, logs] = await Promise.all([
    db.select().from(habit).where(isNull(habit.archivedAt)).orderBy(asc(habit.sortOrder), asc(habit.createdAt)),
    db.select({ habitId: habitLog.habitId, count: habitLog.count }).from(habitLog).where(eq(habitLog.date, dayKey)),
  ]);
  const counts = new Map(logs.map((log) => [log.habitId, log.count]));
  const calendarDate = belgradeCalendarDate(now);
  return habits.filter((item) => isScheduledOn(item, calendarDate, dayKey)).map((item) => ({ habit: item, count: counts.get(item.id) ?? 0 }));
}

export async function loadDashboardGoals() {
  const { dependencies, valuationOptions } = await loadReadModelRuntime();
  const result = await listGoals(dependencies, valuationOptions);
  return result.items.filter((item) => item.isActive).slice(0, 3);
}

export async function loadDashboardTasks(now: Date) {
  const { end } = belgradeDayBounds(belgradeDayKey(now));
  return db.select({ id: task.id, title: task.title, actionAt: task.actionAt, actionEndAt: task.actionEndAt, dueAt: task.dueAt, priority: priority.name })
    .from(task).leftJoin(priority, eq(task.priorityId, priority.id))
    .where(and(inArray(task.status, ["backlog", "in_progress"]), or(isNull(task.actionAt), lt(task.actionAt, end))))
    .orderBy(sql`coalesce(${priority.rank}, 1000)`, sql`${task.dueAt} asc nulls last`, sql`${task.actionAt} asc nulls last`, asc(task.createdAt), asc(task.id)).limit(3);
}

export async function loadDashboardCalendar(now: Date) {
  const dayKey = belgradeDayKey(now);
  const { start, end } = belgradeDayBounds(dayKey);
  // A failed provider still leaves today's tasks visible inside this panel.
  const [tasks, calendar] = await Promise.all([
    db.select({ id: task.id, title: task.title, actionAt: task.actionAt, actionEndAt: task.actionEndAt }).from(task).where(and(
      gte(task.actionAt, start), lt(task.actionAt, end), inArray(task.status, ["backlog", "in_progress", "waiting_for"]),
    )).orderBy(asc(task.actionAt)).limit(100),
    fetchGoogleEventsAction(start.toISOString(), end.toISOString()).catch(() => ({ items: [], error: "Google kalendar trenutno nije dostupan." })),
  ]);
  return {
    plan: assembleTodayPlan(dayKey,
      tasks.filter((item): item is { id: string; title: string; actionAt: Date; actionEndAt: Date | null } => item.actionAt !== null),
      calendar.items.map((item) => ({ id: item.id, title: item.title, dateISO: item.dateISO, endISO: item.endISO, hasTime: item.hasTime }))),
    calendarError: calendar.error,
  };
}
