import { describe, expect, it } from "vitest";
import { filterAndSortTravels, monthGrid, travelsOnDate, type TravelViewItem } from "./view";

const items: TravelViewItem[] = [
  { id: "a", name: "Grčka", region: "evropa", status: "booked", people: "Ana, Marko", startDate: "2026-08-29", endDate: "2026-09-03" },
  { id: "b", name: "Tara", region: "srbija", status: "planning", people: "Mila", startDate: "2026-09-20", endDate: null },
  { id: "c", name: "Ideja", region: "svet", status: "idea", people: null, startDate: null, endDate: null },
];

describe("travel views", () => {
  it("combines region, status, and person filters without case sensitivity", () => {
    expect(filterAndSortTravels(items, { region: "evropa", status: "booked", people: "ana", sort: "asc" }).map((item) => item.id)).toEqual(["a"]);
    expect(filterAndSortTravels(items, { region: "all", status: "all", people: "MARKO", sort: "asc" }).map((item) => item.id)).toEqual(["a"]);
  });

  it("sorts by date in either direction and keeps undated trips last", () => {
    expect(filterAndSortTravels(items, { region: "all", status: "all", people: "", sort: "asc" }).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(filterAndSortTravels(items, { region: "all", status: "all", people: "", sort: "desc" }).map((item) => item.id)).toEqual(["b", "a", "c"]);
  });

  it("shows multi-day trips on every date including both endpoints", () => {
    expect(travelsOnDate(items, "2026-09-01").map((item) => item.id)).toEqual(["a"]);
    expect(travelsOnDate(items, "2026-09-03").map((item) => item.id)).toEqual(["a"]);
    expect(travelsOnDate(items, "2026-09-04")).toEqual([]);
  });

  it("starts the month grid on Monday and includes adjacent days", () => {
    const days = monthGrid(2026, 9);
    expect(days[0]).toBe("2026-08-31");
    expect(days.at(-1)).toBe("2026-10-04");
    expect(days).toHaveLength(35);
  });
});
