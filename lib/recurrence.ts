import { addDays, addMonths, getDate, getDay, getDaysInMonth, setDate } from "date-fns";
import type { RecurrenceRule } from "@/db/schema/tasks";

export function nextOccurrence(rule: RecurrenceRule, from: Date): Date {
  if (rule.interval < 1) throw new Error("interval must be >= 1");

  switch (rule.freq) {
    case "daily":
      return addDays(from, rule.interval);

    case "weekly": {
      const days = rule.byweekday;
      if (!days || days.length === 0) {
        return addDays(from, 7 * rule.interval);
      }
      const sorted = [...new Set(days)].sort((a, b) => a - b);
      const fromDow = getDay(from);
      const next = sorted.find((d) => d > fromDow);
      if (next !== undefined) {
        return addDays(from, next - fromDow);
      }
      const first = sorted[0];
      const jump = 7 * rule.interval - fromDow + first;
      return addDays(from, jump);
    }

    case "monthly": {
      const target = addMonths(from, rule.interval);
      const originalDay = getDate(from);
      const maxDay = getDaysInMonth(target);
      return setDate(target, Math.min(originalDay, maxDay));
    }
  }
}
