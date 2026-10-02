import { localDay, localTime } from "@/lib/date-picker";

/** Call in the browser when opening the editor, using the same zone as creation. */
export function mealTimeForInput(eatenAt: Date | string | null): string {
  return eatenAt ? localTime(new Date(eatenAt)) : "";
}

export function mealTimeToIso(date: string, time: string, original?: Date | string | null): string | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  // Preserve the exact instant if the time was not changed, including the
  // second occurrence of a repeated clock time when daylight saving ends.
  if (original) {
    const previous = new Date(original);
    if (localDay(previous) === date && localTime(previous) === time) return previous.toISOString();
  }
  return new Date(`${date}T${time}:00`).toISOString();
}
