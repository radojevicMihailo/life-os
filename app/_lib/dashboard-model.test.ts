import { describe, expect, it } from "vitest";
import { assembleTodayPlan, belgradeDayBounds, belgradeDayKey } from "./dashboard-model";

describe("Belgrade dashboard day", () => {
  it("uses the local day at the UTC boundary", () => {
    expect(belgradeDayKey(new Date("2026-09-26T22:30:00Z"))).toBe("2026-09-27");
    expect(belgradeDayKey(new Date("2026-01-01T22:30:00Z"))).toBe("2026-01-01");
  });

  it("keeps only today's planned items and sorts all-day events first", () => {
    const items = assembleTodayPlan("2026-09-27", [
      { id: "today", title: "Planirano", actionAt: new Date("2026-09-26T22:30:00Z") },
      { id: "yesterday", title: "Juče", actionAt: new Date("2026-09-26T18:00:00Z") },
    ], [
      { id: "all-day", title: "Ceo dan", dateISO: "2026-09-27", hasTime: false },
      { id: "later", title: "Kasnije", dateISO: "2026-09-27T11:00:00Z", hasTime: true },
    ]);

    expect(items.map((item) => item.id)).toEqual(["google:all-day", "task:today", "google:later"]);
    expect(items[1].href).toBe("/tasks/today");
  });

  it("includes events that overlap today and respects exclusive all-day ends", () => {
    const items = assembleTodayPlan("2026-09-27", [], [
      { id: "holiday", title: "Odmor", dateISO: "2026-09-26", endISO: "2026-09-29", hasTime: false },
      { id: "overnight", title: "Noćni događaj", dateISO: "2026-09-26T21:00:00Z", endISO: "2026-09-27T01:00:00Z", hasTime: true },
      { id: "ended", title: "Završeno", dateISO: "2026-09-26", endISO: "2026-09-27", hasTime: false },
      { id: "midnight", title: "Do ponoći", dateISO: "2026-09-26T18:00:00Z", endISO: "2026-09-26T22:00:00Z", hasTime: true },
    ]);

    expect(items.map((item) => item.id)).toEqual(["google:holiday", "google:overnight"]);
    expect(items[1].ongoing).toBe(true);
  });

  it("uses Belgrade midnight across daylight saving changes", () => {
    expect(belgradeDayBounds("2026-03-29")).toEqual({
      start: new Date("2026-03-28T23:00:00Z"),
      end: new Date("2026-03-29T22:00:00Z"),
    });
  });
});

it("selects an ongoing or future event without reviving finished events", async () => {
  const { nextPlanItem } = await import("./dashboard-model");
  const plan = assembleTodayPlan("2026-09-27", [], [
    { id: "ended", title: "Gotovo", dateISO: "2026-09-27T08:00:00Z", endISO: "2026-09-27T09:00:00Z", hasTime: true },
    { id: "ongoing", title: "Sada", dateISO: "2026-09-27T09:00:00Z", endISO: "2026-09-27T11:00:00Z", hasTime: true },
    { id: "later", title: "Kasnije", dateISO: "2026-09-27T12:00:00Z", hasTime: true },
  ]);
  expect(nextPlanItem(plan, new Date("2026-09-27T10:00:00Z"))?.title).toBe("Sada");
  expect(nextPlanItem(plan, new Date("2026-09-27T13:00:00Z"))).toBeUndefined();
});

it("retains task end times so an ongoing task remains next on the plan", async () => {
  const { nextPlanItem } = await import("./dashboard-model");
  const plan = assembleTodayPlan("2026-09-27", [{ id: "working", title: "Rad", actionAt: new Date("2026-09-27T09:00:00Z"), actionEndAt: new Date("2026-09-27T11:00:00Z") }], []);
  expect(nextPlanItem(plan, new Date("2026-09-27T10:00:00Z"))?.title).toBe("Rad");
  expect(nextPlanItem(plan, new Date("2026-09-27T11:00:00Z"))).toBeUndefined();
});
