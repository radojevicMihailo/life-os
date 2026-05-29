import { format, isToday, isTomorrow, isYesterday, isThisYear } from "date-fns";
import { hasTimeComponent } from "@/lib/date-input";

export function formatTaskDate(d: Date, withTime?: boolean): string {
  const showTime = withTime ?? hasTimeComponent(d);
  const dateLabel = isToday(d)
    ? "Today"
    : isTomorrow(d)
      ? "Tomorrow"
      : isYesterday(d)
        ? "Yesterday"
        : format(d, isThisYear(d) ? "MMM d" : "MMM d yyyy");
  return showTime ? `${dateLabel} ${format(d, "HH:mm")}` : dateLabel;
}

export function formatDateRange(start: Date, end: Date | null): string {
  if (!end) return formatTaskDate(start);
  const startStr = formatTaskDate(start);
  const endStr = formatTaskDate(end);
  if (startStr === endStr) return startStr;
  return `${startStr} → ${endStr}`;
}

export const formatDueDate = formatTaskDate;
