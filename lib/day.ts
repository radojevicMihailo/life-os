export function belgradeDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function belgradeDayBounds(dayKey: string): { start: Date; end: Date } {
  const midnight = (key: string) => {
    const utcMidnight = new Date(`${key}T00:00:00Z`);
    const localHour = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Belgrade", hour: "2-digit", hourCycle: "h23",
    }).format(utcMidnight));
    return new Date(utcMidnight.getTime() - localHour * 60 * 60 * 1000);
  };
  const nextDay = new Date(`${dayKey}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { start: midnight(dayKey), end: midnight(nextDay.toISOString().slice(0, 10)) };
}

// A calendar-only Date for date-fns helpers; local noon avoids midnight DST edges.
export function belgradeCalendarDate(now = new Date()): Date {
  const [year, month, day] = belgradeDayKey(now).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
