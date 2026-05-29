import { describe, expect, it } from "vitest";
import { createTaskSchema, updateTaskSchema, recurrenceRuleSchema } from "./tasks";

describe("createTaskSchema", () => {
  it("accepts a minimal valid input", () => {
    const r = createTaskSchema.safeParse({ title: "Buy milk" });
    expect(r.success).toBe(true);
  });

  it("trims title", () => {
    const r = createTaskSchema.parse({ title: "  hello  " });
    expect(r.title).toBe("hello");
  });

  it("rejects empty title", () => {
    expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects non-uuid projectId", () => {
    expect(
      createTaskSchema.safeParse({ title: "x", projectId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("rejects out-of-range priority", () => {
    expect(createTaskSchema.safeParse({ title: "x", priority: 4 }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "x", priority: -1 }).success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("requires id", () => {
    expect(updateTaskSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("accepts id + partial patch", () => {
    const r = updateTaskSchema.safeParse({
      id: "00000000-0000-0000-0000-000000000000",
      title: "new",
    });
    expect(r.success).toBe(true);
  });
});

describe("recurrenceRuleSchema", () => {
  it("accepts daily/interval=1", () => {
    expect(recurrenceRuleSchema.safeParse({ freq: "daily", interval: 1 }).success).toBe(true);
  });

  it("accepts weekly with byweekday", () => {
    const r = recurrenceRuleSchema.parse({
      freq: "weekly",
      interval: 2,
      byweekday: [1, 3, 5],
    });
    expect(r.byweekday).toEqual([1, 3, 5]);
  });

  it("rejects byweekday out of range", () => {
    expect(
      recurrenceRuleSchema.safeParse({ freq: "weekly", interval: 1, byweekday: [7] }).success,
    ).toBe(false);
  });

  it("rejects non-positive interval", () => {
    expect(recurrenceRuleSchema.safeParse({ freq: "daily", interval: 0 }).success).toBe(false);
  });
});
