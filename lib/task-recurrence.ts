import type { RecurrenceRule } from "@/db/schema/tasks";
import { nextOccurrence } from "@/lib/recurrence";

export function recurrenceDates(existing: {
  recurrence: RecurrenceRule;
  actionAt: Date | null;
  actionEndAt: Date | null;
  dueAt: Date | null;
}) {
  const actionAt = existing.actionAt ? nextOccurrence(existing.recurrence, existing.actionAt) : null;
  // Keep the scheduled duration. Advancing endpoints independently can shorten
  // or invert an event when a monthly recurrence is clamped to month end.
  const actionEndAt = actionAt && existing.actionAt && existing.actionEndAt
    ? new Date(actionAt.getTime() + existing.actionEndAt.getTime() - existing.actionAt.getTime())
    : null;
  return { actionAt, actionEndAt, dueAt: existing.dueAt ? nextOccurrence(existing.recurrence, existing.dueAt) : null };
}
