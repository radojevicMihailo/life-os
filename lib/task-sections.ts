import { addDays, endOfWeek, isBefore, startOfDay } from "date-fns";
import type { Task } from "@/db/schema/tasks";

export type SectionKey = "overdue" | "today" | "tomorrow" | "this-week" | "later" | "no-date";

export const sectionOrder: SectionKey[] = [
  "overdue",
  "today",
  "tomorrow",
  "this-week",
  "later",
  "no-date",
];

export const sectionLabels: Record<SectionKey, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  "this-week": "This week",
  later: "Later",
  "no-date": "No date",
};

const weekStartsOn = 1 as const;

export function sectionForTask(
  t: Pick<Task, "dueAt" | "actionAt">,
  now: Date = new Date(),
): SectionKey {
  const raw = t.dueAt ?? t.actionAt;
  if (!raw) return "no-date";
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const weekEnd = endOfWeek(now, { weekStartsOn });
  const d = raw instanceof Date ? raw : new Date(raw);

  if (isBefore(d, today)) return "overdue";
  if (isBefore(d, tomorrow)) return "today";
  if (isBefore(d, dayAfterTomorrow)) return "tomorrow";
  if (isBefore(d, addDays(weekEnd, 1))) return "this-week";
  return "later";
}

export function groupBySection<T extends Pick<Task, "dueAt" | "actionAt">>(
  tasks: T[],
): Record<SectionKey, T[]> {
  const now = new Date();
  const buckets: Record<SectionKey, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    "this-week": [],
    later: [],
    "no-date": [],
  };
  for (const t of tasks) buckets[sectionForTask(t, now)].push(t);
  return buckets;
}
