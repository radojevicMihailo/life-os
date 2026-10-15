import { belgradeDayKey, belgradeDayBounds } from "@/lib/day";
export { belgradeDayKey, belgradeDayBounds } from "@/lib/day";

export type HomePlanItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  href: string;
  source: "task" | "google";
  allDay: boolean;
  ongoing: boolean;
};

export function assembleTodayPlan(
  dayKey: string,
  tasks: { id: string; title: string; actionAt: Date; actionEndAt?: Date | null }[],
  events: { id: string; title: string; dateISO: string; endISO?: string; hasTime: boolean }[],
): HomePlanItem[] {
  const { start, end } = belgradeDayBounds(dayKey);
  const items: HomePlanItem[] = [
    ...tasks.filter((item) => belgradeDayKey(item.actionAt) === dayKey).map((item) => ({
      id: `task:${item.id}`, title: item.title, startsAt: item.actionAt.toISOString(), endsAt: item.actionEndAt?.toISOString(),
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
      id: `google:${item.id}`, title: item.title, startsAt: item.dateISO, endsAt: item.endISO,
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

export function nextPlanItem(items: HomePlanItem[], now: Date): HomePlanItem | undefined {
  return items.filter((item) => !item.allDay && (
    new Date(item.startsAt).getTime() >= now.getTime() ||
    (item.endsAt !== undefined && new Date(item.endsAt).getTime() > now.getTime())
  )).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}
