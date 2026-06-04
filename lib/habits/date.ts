import { addDays, format, startOfWeek } from "date-fns";

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function lastNDays(n: number, today: Date): Date[] {
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

export function weekStartMon(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekKey(d: Date): string {
  return isoDate(weekStartMon(d));
}
