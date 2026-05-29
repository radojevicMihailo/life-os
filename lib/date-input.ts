import { format } from "date-fns";

export function dateToInputValue(d: Date | null | undefined, withTime: boolean): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return withTime ? format(date, "yyyy-MM-dd'T'HH:mm") : format(date, "yyyy-MM-dd");
}

export function inputValueToDate(v: string, withTime: boolean): Date | null {
  if (!v) return null;
  return withTime ? new Date(v) : new Date(`${v}T00:00:00`);
}

export function hasTimeComponent(d: Date | null | undefined): boolean {
  if (!d) return false;
  const date = d instanceof Date ? d : new Date(d);
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}
