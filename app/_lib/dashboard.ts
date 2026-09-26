import "server-only";

import { and, asc, eq, gte, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { habit, habitLog } from "@/db/schema/habits";
import { task } from "@/db/schema/tasks";
import { isScheduledOn } from "@/lib/habits/schedule";
import { fetchGoogleEventsAction } from "@/app/(tasks)/_actions/google";
import { listGoals } from "@/modules/finance/read-models/goals";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { assembleTodayPlan, belgradeDayBounds, belgradeDayKey } from "./dashboard-model";

export async function loadHomeDashboard() {
  const now = new Date();
  const dayKey = belgradeDayKey(now);
  const [year, month, day] = dayKey.split("-").map(Number);
  const weekdayDate = new Date(year, month - 1, day, 12);
  const { start: windowStart, end: windowEnd } = belgradeDayBounds(dayKey);

  const [{ dependencies }, habits, logs, tasks, calendar] = await Promise.all([
    loadReadModelRuntime(),
    db.select().from(habit).where(isNull(habit.archivedAt)).orderBy(asc(habit.sortOrder), asc(habit.createdAt)),
    db.select({ habitId: habitLog.habitId, count: habitLog.count }).from(habitLog).where(eq(habitLog.date, dayKey)),
    db.select({ id: task.id, title: task.title, actionAt: task.actionAt }).from(task).where(and(
      gte(task.actionAt, windowStart), lt(task.actionAt, windowEnd),
      ne(task.status, "done"), ne(task.status, "canceled"),
    )).orderBy(asc(task.actionAt)).limit(100),
    fetchGoogleEventsAction(windowStart.toISOString(), windowEnd.toISOString()),
  ]);
  const goalResult = await listGoals(dependencies);
  const logCounts = new Map(logs.map((log) => [log.habitId, log.count]));

  return {
    date: now.toISOString(),
    habits: habits.filter((item) => isScheduledOn(item, weekdayDate, dayKey)).map((item) => ({
      id: item.id, title: item.title,
      completed: (logCounts.get(item.id) ?? 0) >= (item.kind === "count" ? item.targetCount : 1),
    })),
    goals: goalResult.items.filter((item) => item.isActive).slice(0, 3),
    plan: assembleTodayPlan(
      dayKey,
      tasks.filter((item): item is { id: string; title: string; actionAt: Date } => item.actionAt !== null),
      calendar.items.map((item) => ({ id: item.id, title: item.title, dateISO: item.dateISO, endISO: item.endISO, hasTime: item.hasTime })),
    ).slice(0, 5),
    calendarError: calendar.error,
  };
}
