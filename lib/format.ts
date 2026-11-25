import { format, isToday, isTomorrow, isYesterday, isThisYear } from "date-fns";
import { srLatn } from "date-fns/locale";
import { hasTimeComponent } from "@/lib/date-input";

export function formatTaskDate(d: Date, withTime?: boolean): string {
  const showTime = withTime ?? hasTimeComponent(d);
  const dateLabel = isToday(d)
    ? "Danas"
    : isTomorrow(d)
      ? "Sutra"
      : isYesterday(d)
        ? "Juče"
        : format(d, isThisYear(d) ? "d. MMM" : "d. MMM yyyy.", { locale: srLatn });
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
