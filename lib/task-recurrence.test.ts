import { describe, expect, it } from "vitest";
import { recurrenceDates } from "./task-recurrence";

describe("recurrenceDates", () => {
  it("moves both ends together and preserves the duration across month boundaries", () => {
    const actionAt = new Date(2026, 0, 31, 23);
    const actionEndAt = new Date(2026, 1, 1, 1);
    const next = recurrenceDates({ recurrence: { freq: "monthly", interval: 1 }, actionAt, actionEndAt, dueAt: null });
    expect(next.actionAt).toEqual(new Date(2026, 1, 28, 23));
    expect(next.actionEndAt).toEqual(new Date(2026, 2, 1, 1));
    expect(next.dueAt).toBeNull();
  });
  it("does not invent a deadline for action-only recurring tasks", () => {
    const next = recurrenceDates({ recurrence: { freq: "daily", interval: 1 }, actionAt: new Date(2026, 9, 2, 10), actionEndAt: null, dueAt: null });
    expect(next.actionAt).toEqual(new Date(2026, 9, 3, 10));
    expect(next.actionEndAt).toBeNull();
    expect(next.dueAt).toBeNull();
  });
  it("keeps undated recurring tasks undated", () => {
    expect(recurrenceDates({ recurrence: { freq: "daily", interval: 1 }, actionAt: null, actionEndAt: null, dueAt: null })).toEqual({ actionAt: null, actionEndAt: null, dueAt: null });
  });
});
