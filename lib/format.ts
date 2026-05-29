import { format, isToday, isTomorrow, isYesterday, isThisYear } from "date-fns";

export function formatDueDate(d: Date): string {
  if (isToday(d)) return `Today ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Tomorrow ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, isThisYear(d) ? "MMM d HH:mm" : "MMM d yyyy");
}

export const priorityLabel: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
};

export const priorityColor: Record<number, string> = {
  0: "transparent",
  1: "#64748b",
  2: "#f59e0b",
  3: "#ef4444",
};
