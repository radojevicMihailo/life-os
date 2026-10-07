import { describe, expect, it } from "vitest";
import { calendarDays, changeCalendarMonth, changeCalendarYear, dayValue, localDay, localTime, parseLocalDay, withinBounds } from "./date-picker";

describe("local date picker values", () => {
  it("jumps directly to a month while preserving year and time and clamping the day", () => {
    const original = new Date(2026, 0, 31, 14, 37);
    const changed = changeCalendarMonth(original, 1);
    expect(localDay(changed)).toBe("2026-02-28");
    expect(localTime(changed)).toBe("14:37");
    expect(localDay(original)).toBe("2026-01-31");
    expect(localDay(changeCalendarMonth(new Date(2024, 0, 31, 12), 1))).toBe("2024-02-29");
    expect(localDay(changeCalendarMonth(new Date(2026, 0, 7, 12), 11))).toBe("2026-12-07");
  });
  it("jumps directly to a year while keeping the month, day and time", () => {
    const original = new Date(2026, 9, 7, 14, 37);
    const changed = changeCalendarYear(original, 1995);
    expect(localDay(changed)).toBe("1995-10-07");
    expect(localTime(changed)).toBe("14:37");
    expect(localDay(original)).toBe("2026-10-07");
  });
  it("keeps leap-day navigation in February when the target year is not leap", () => {
    expect(localDay(changeCalendarYear(new Date(2024, 1, 29, 12), 2025))).toBe("2025-02-28");
    expect(localDay(changeCalendarYear(new Date(2024, 1, 29, 12), 2028))).toBe("2028-02-29");
  });
  it("parses local dates without UTC shifts and rejects calendar overflow", () => {
    const date = parseLocalDay("2026-10-02T19:20")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 2]);
    expect(localDay(date)).toBe("2026-10-02");
    expect(parseLocalDay("2026-02-29")).toBeNull();
    expect(parseLocalDay("2024-02-29")).not.toBeNull();
    expect(parseLocalDay("2026-13-01")).toBeNull();
    expect(parseLocalDay("no date")).toBeNull();
  });
  it("builds a full Monday-first calendar across months and leap years", () => {
    const days = calendarDays(new Date(2024, 1, 1));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(localDay(days[0])).toBe("2024-01-29");
    expect(days.map(localDay)).toContain("2024-02-29");
    expect(new Set(days.map(localDay)).size).toBe(42);
  });
  it("retains selected time when changing date and uses local current time initially", () => {
    const day = new Date(2026, 9, 2);
    const now = new Date(2026, 9, 1, 14, 37);
    expect(dayValue(day, "datetime-local", "2026-09-30T08:15", undefined, undefined, now)).toBe("2026-10-02T08:15");
    expect(dayValue(day, "datetime-local", "", undefined, undefined, now)).toBe("2026-10-02T14:37");
    expect(dayValue(day, "date", "2026-09-30T08:15")).toBe("2026-10-02");
    expect(localTime(now)).toBe("14:37");
  });
  it("clamps time on boundary dates, disables dates outside bounds and permits exact bounds", () => {
    const day = new Date(2026, 9, 2);
    expect(dayValue(day, "datetime-local", "2026-10-01T08:15", "2026-10-02T09:00")).toBe("2026-10-02T09:00");
    expect(dayValue(day, "datetime-local", "2026-10-01T22:15", undefined, "2026-10-02T20:00")).toBe("2026-10-02T20:00");
    expect(withinBounds("2026-10-02", "2026-10-02", "2026-10-02")).toBe(true);
    expect(withinBounds("2026-10-01", "2026-10-02")).toBe(false);
    expect(withinBounds("2026-10-03", undefined, "2026-10-02")).toBe(false);
    expect(withinBounds("08:59", "09:00", "17:00")).toBe(false);
    expect(withinBounds("17:00", "09:00", "17:00")).toBe(true);
  });
});
