import { getDay } from "date-fns";
import type { Habit } from "@/db/schema/habits";

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const ALL_WEEKDAYS_MASK = 127;

export function weekdayIndexMonFirst(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

export function weekdayBit(date: Date): number {
  return 1 << weekdayIndexMonFirst(date);
}

export function maskHasWeekday(mask: number, date: Date): boolean {
  return (mask & weekdayBit(date)) !== 0;
}

export function toggleWeekday(mask: number, idx: number): number {
  return mask ^ (1 << idx);
}

export function isInRange(habit: Habit, isoDate: string): boolean {
  if (isoDate < habit.startDate) return false;
  if (habit.endDate && isoDate > habit.endDate) return false;
  return true;
}

export function isScheduledOn(habit: Habit, date: Date, isoDate: string): boolean {
  if (!isInRange(habit, isoDate)) return false;
  if (habit.cadence === "weekdays") return maskHasWeekday(habit.weekdays, date);
  return true;
}
