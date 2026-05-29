import { describe, expect, it } from "vitest";
import { sectionForTask } from "./task-sections";

const now = new Date("2026-05-29T12:00:00Z");
const day = (iso: string) => new Date(iso);

describe("sectionForTask", () => {
  it("no due date → no-date", () => {
    expect(sectionForTask({ dueAt: null }, now)).toBe("no-date");
  });

  it("due yesterday → overdue", () => {
    expect(sectionForTask({ dueAt: day("2026-05-28T08:00:00Z") }, now)).toBe("overdue");
  });

  it("due today (later) → today", () => {
    expect(sectionForTask({ dueAt: day("2026-05-29T20:00:00Z") }, now)).toBe("today");
  });

  it("due tomorrow → tomorrow", () => {
    expect(sectionForTask({ dueAt: day("2026-05-30T09:00:00Z") }, now)).toBe("tomorrow");
  });

  it("due later this week (Sunday, weekStartsOn=1) → this-week", () => {
    expect(sectionForTask({ dueAt: day("2026-05-31T09:00:00Z") }, now)).toBe("this-week");
  });

  it("due next week → later", () => {
    expect(sectionForTask({ dueAt: day("2026-06-08T09:00:00Z") }, now)).toBe("later");
  });
});
