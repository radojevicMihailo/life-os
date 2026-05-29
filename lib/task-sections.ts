import { startOfDay, addDays, isBefore } from "date-fns";
import type { Task } from "@/db/schema/tasks";

export type SectionKey = "overdue" | "today" | "upcoming" | "no-date";

export const sectionOrder: SectionKey[] = ["overdue", "today", "upcoming", "no-date"];

export const sectionLabels: Record<SectionKey, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  "no-date": "No date",
};

export function sectionForTask(t: Pick<Task, "dueAt">, now: Date = new Date()): SectionKey {
  if (!t.dueAt) return "no-date";
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const due = t.dueAt instanceof Date ? t.dueAt : new Date(t.dueAt);
  if (isBefore(due, today)) return "overdue";
  if (isBefore(due, tomorrow)) return "today";
  return "upcoming";
}

export function groupBySection<T extends Pick<Task, "dueAt">>(
  tasks: T[],
): Record<SectionKey, T[]> {
  const now = new Date();
  const buckets: Record<SectionKey, T[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    "no-date": [],
  };
  for (const t of tasks) buckets[sectionForTask(t, now)].push(t);
  return buckets;
}
