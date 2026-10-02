/** Local calendar values never pass through UTC serialization. */
export type DateInputType = "date" | "datetime-local" | "time";
const pad = (value: number) => String(value).padStart(2, "0");
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
export function calendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  start.setDate(1 - (start.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
}
export function withinBounds(value: string, min?: string | number, max?: string | number): boolean {
  // ISO local calendar strings sort chronologically, including partial minute values.
  return (!min || value >= String(min)) && (!max || value <= String(max));
}
export function dayValue(day: Date, type: DateInputType, value: string, min?: string | number, max?: string | number, now = new Date()): string {
  const date = localDay(day);
  if (type === "date") return date;
  let candidate = `${date}T${value.split("T")[1] || localTime(now)}`;
  if (min && String(min).slice(0, 10) === date && candidate < String(min)) candidate = String(min);
  if (max && String(max).slice(0, 10) === date && candidate > String(max)) candidate = String(max);
  return candidate;
}
