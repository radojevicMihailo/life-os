import { describe, expect, it } from "vitest";
import { sectionForTask } from "./task-sections";

const now = new Date("2026-05-29T12:00:00Z");
const day = (iso: string) => new Date(iso);

describe("sectionForTask", () => {
  it("no due date → no-date", () => {
    expect(sectionForTask({ dueAt: null, actionAt: null }, now)).toBe("no-date");
  });

  it("due yesterday → overdue", () => {
    expect(sectionForTask({ dueAt: day("2026-05-28T08:00:00Z"), actionAt: null }, now)).toBe(
      "overdue",
    );
  });

  it("due today (later) → today", () => {
    expect(sectionForTask({ dueAt: day("2026-05-29T20:00:00Z"), actionAt: null }, now)).toBe(
      "today",
    );
  });

  it("due tomorrow → tomorrow", () => {
    expect(sectionForTask({ dueAt: day("2026-05-30T09:00:00Z"), actionAt: null }, now)).toBe(
      "tomorrow",
    );
  });

  it("due later this week (Sunday, weekStartsOn=1) → this-week", () => {
    expect(sectionForTask({ dueAt: day("2026-05-31T09:00:00Z"), actionAt: null }, now)).toBe(
      "this-week",
    );
  });

  it("due next week → later", () => {
    expect(sectionForTask({ dueAt: day("2026-06-08T09:00:00Z"), actionAt: null }, now)).toBe(
      "later",
    );
  });

  it("no dueAt but actionAt → groups by actionAt", () => {
    expect(sectionForTask({ dueAt: null, actionAt: day("2026-05-29T20:00:00Z") }, now)).toBe(
      "today",
    );
  });
});
