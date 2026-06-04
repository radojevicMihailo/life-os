import { addDays } from "date-fns";
import type { Habit, HabitLog } from "@/db/schema/habits";
import { isoDate, weekKey } from "./date";
import { isInRange, isScheduledOn } from "./schedule";

export type LogMap = Map<string, number>;

export function buildLogMap(logs: HabitLog[]): LogMap {
  const m = new Map<string, number>();
  for (const l of logs) m.set(l.date, l.count);
  return m;
}

export function metOnDay(habit: Habit, count: number | undefined): boolean {
  if (count == null) return false;
  if (habit.kind === "binary") return count >= 1;
  return count >= habit.targetCount;
}

export function dayProgress(habit: Habit, count: number | undefined): number {
  if (count == null || count <= 0) return 0;
  if (habit.kind === "binary") return 1;
  return Math.min(1, count / Math.max(1, habit.targetCount));
}

function currentStreakDailyLike(
  habit: Habit,
  logs: LogMap,
  today: Date,
): number {
  let streak = 0;
  let cursor = today;
  while (true) {
    const iso = isoDate(cursor);
    if (!isInRange(habit, iso)) break;
    if (isScheduledOn(habit, cursor, iso)) {
      if (metOnDay(habit, logs.get(iso))) streak++;
      else if (iso === isoDate(today) && !logs.has(iso)) {
        // today not yet logged — skip without breaking
      } else break;
    }
    cursor = addDays(cursor, -1);
    if (streak > 3650) break;
  }
  return streak;
}

function metWeekTarget(
  habit: Habit,
  logs: LogMap,
  weekStart: Date,
): boolean {
  let met = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const iso = isoDate(d);
    if (!isInRange(habit, iso)) continue;
    if (metOnDay(habit, logs.get(iso))) met++;
  }
  return met >= habit.weeklyTarget;
}

function currentStreakWeekly(habit: Habit, logs: LogMap, today: Date): number {
  let streak = 0;
  let cursor = today;
  const isCurrentWeek = (d: Date) => weekKey(d) === weekKey(today);
  while (true) {
    const ws = new Date(weekKey(cursor));
    if (metWeekTarget(habit, logs, ws)) streak++;
    else if (isCurrentWeek(cursor)) {
      // current week not yet met — don't break
    } else break;
    cursor = addDays(ws, -1);
    if (streak > 520) break;
  }
  return streak;
}

export function currentStreak(habit: Habit, logs: LogMap, today: Date): number {
  if (habit.cadence === "weekly_target") return currentStreakWeekly(habit, logs, today);
  return currentStreakDailyLike(habit, logs, today);
}

export function bestStreak(habit: Habit, logs: LogMap, today: Date): number {
  const start = new Date(habit.startDate);
  if (habit.cadence === "weekly_target") {
    let best = 0;
    let run = 0;
    let ws = new Date(weekKey(start));
    const end = today;
    while (ws <= end) {
      if (metWeekTarget(habit, logs, ws)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
      ws = addDays(ws, 7);
    }
    return best;
  }

  let best = 0;
  let run = 0;
  let cursor = start;
  while (cursor <= today) {
    const iso = isoDate(cursor);
    if (isScheduledOn(habit, cursor, iso)) {
      if (metOnDay(habit, logs.get(iso))) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

export function completionPct30d(
  habit: Habit,
  logs: LogMap,
  today: Date,
): number {
  let scheduled = 0;
  let met = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    const iso = isoDate(d);
    if (!isScheduledOn(habit, d, iso)) continue;
    scheduled++;
    if (metOnDay(habit, logs.get(iso))) met++;
  }
  if (scheduled === 0) return 0;
  return Math.round((met / scheduled) * 100);
}
