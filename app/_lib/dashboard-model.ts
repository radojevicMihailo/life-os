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

export type HomePlanItem = {
  id: string;
  title: string;
  startsAt: string;
  href: string;
  source: "task" | "google";
  allDay: boolean;
  ongoing: boolean;
};

export function assembleTodayPlan(
  dayKey: string,
  tasks: { id: string; title: string; actionAt: Date }[],
  events: { id: string; title: string; dateISO: string; endISO?: string; hasTime: boolean }[],
): HomePlanItem[] {
  const { start, end } = belgradeDayBounds(dayKey);
  const items: HomePlanItem[] = [
    ...tasks.filter((item) => belgradeDayKey(item.actionAt) === dayKey).map((item) => ({
      id: `task:${item.id}`, title: item.title, startsAt: item.actionAt.toISOString(),
      href: `/tasks/${item.id}`, source: "task" as const, allDay: false, ongoing: false,
    })),
    ...events.filter((item) => {
      if (!item.hasTime) {
        const startDay = item.dateISO.slice(0, 10);
        const endDay = item.endISO?.slice(0, 10);
        return startDay <= dayKey && (endDay ? endDay > dayKey : startDay === dayKey);
      }
      const eventStart = new Date(item.dateISO).getTime();
      const eventEnd = item.endISO ? new Date(item.endISO).getTime() : eventStart + 1;
      return eventStart < end.getTime() && eventEnd > start.getTime();
    }).map((item) => ({
      id: `google:${item.id}`, title: item.title, startsAt: item.dateISO,
      href: "/calendar", source: "google" as const, allDay: !item.hasTime,
      ongoing: item.hasTime && new Date(item.dateISO).getTime() < start.getTime(),
    })),
  ];
  return items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}
