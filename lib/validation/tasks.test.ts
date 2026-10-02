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

  it("rejects non-uuid priorityId", () => {
    expect(
      createTaskSchema.safeParse({ title: "x", priorityId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("accepts valid status", () => {
    expect(createTaskSchema.safeParse({ title: "x", status: "in_progress" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(createTaskSchema.safeParse({ title: "x", status: "bogus" }).success).toBe(false);
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

it("rejects custom priority ids now that only four quadrants are supported", () => {
  expect(createTaskSchema.safeParse({ title: "x", priorityId: "12345678-1234-4234-8234-123456789abc" }).success).toBe(false);
});
it("rejects an action end before its start", () => {
  expect(createTaskSchema.safeParse({ title: "x", actionAt: new Date("2026-10-02T12:00:00Z"), actionEndAt: new Date("2026-10-02T11:00:00Z") }).success).toBe(false);
});
it("deduplicates contexts rather than failing a database primary key", () => {
  const id = "12345678-1234-4234-8234-123456789abc";
  expect(createTaskSchema.parse({ title: "x", contextIds: [id,id] }).contextIds).toEqual([id]);
});
