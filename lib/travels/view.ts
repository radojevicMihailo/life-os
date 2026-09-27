import type { TravelRegion, TravelStatus } from "@/db/schema/travels";

export type TravelViewItem = {
  id: string;
  name: string;
  region: TravelRegion;
  status: TravelStatus;
  people: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type TravelFilters = {
  region: TravelRegion | "all";
  status: TravelStatus | "all";
  people: string;
  sort: "asc" | "desc";
};

export function filterAndSortTravels<T extends TravelViewItem>(items: T[], filters: TravelFilters): T[] {
  const person = filters.people.trim().toLocaleLowerCase("sr-Latn-RS");
  return items
    .filter((item) =>
      (filters.region === "all" || item.region === filters.region) &&
      (filters.status === "all" || item.status === filters.status) &&
      (!person || (item.people ?? "").toLocaleLowerCase("sr-Latn-RS").includes(person)))
    .sort((a, b) => {
      const aDate = a.startDate ?? a.endDate;
      const bDate = b.startDate ?? b.endDate;
      if (!aDate) return bDate ? 1 : a.name.localeCompare(b.name, "sr-Latn-RS");
      if (!bDate) return -1;
      const order = aDate.localeCompare(bDate) * (filters.sort === "asc" ? 1 : -1);
      return order || a.name.localeCompare(b.name, "sr-Latn-RS");
    });
}

export function travelsOnDate<T extends TravelViewItem>(items: T[], date: string): T[] {
  return items.filter((item) => {
    const start = item.startDate ?? item.endDate;
    const end = item.endDate ?? item.startDate;
    if (!start || !end) return false;
    return date >= (start < end ? start : end) && date <= (start > end ? start : end);
  });
}

export function monthGrid(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  first.setUTCDate(first.getUTCDate() - mondayOffset);
  const last = new Date(Date.UTC(year, month, 0));
  const days: string[] = [];
  for (let cursor = first; cursor <= last || days.length % 7 !== 0; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}
