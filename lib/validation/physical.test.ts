import { describe, expect, it } from "vitest";
import {
  buildActivityValuesSchema,
  buildSubrowValuesSchema,
  activityPayloadSchema,
  setEntrySchema,
} from "./physical";
import type { PhysicalField } from "@/db/schema/physical";

const baseField = (overrides: Partial<PhysicalField>): PhysicalField =>
  ({
    id: "00000000-0000-0000-0000-000000000000",
    scope: "top",
    key: "f",
    label: "F",
    kind: "text",
    required: false,
    sortOrder: 0,
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PhysicalField;

describe("buildActivityValuesSchema", () => {
  it("text optional", () => {
    const schema = buildActivityValuesSchema([baseField({ key: "notes", kind: "text" })]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ notes: "hello" }).success).toBe(true);
  });
  it("text required rejects empty object", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "notes", kind: "text", required: true }),
    ]);
    expect(schema.safeParse({}).success).toBe(false);
  });
  it("number kind rejects strings", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "reps", kind: "number", required: true }),
    ]);
    expect(schema.safeParse({ reps: "5" }).success).toBe(false);
    expect(schema.safeParse({ reps: 5 }).success).toBe(true);
  });
  it("distance_km accepts decimal, rejects negative", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "d", kind: "distance_km", required: true }),
    ]);
    expect(schema.safeParse({ d: 5.25 }).success).toBe(true);
    expect(schema.safeParse({ d: -1 }).success).toBe(false);
  });
  it("category_ref expects uuid", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "c", kind: "category_ref", required: true }),
    ]);
    expect(schema.safeParse({ c: "not-a-uuid" }).success).toBe(false);
    expect(schema.safeParse({ c: "11111111-1111-4111-8111-111111111111" }).success).toBe(true);
  });
});

describe("buildSubrowValuesSchema", () => {
  it("sets_array rejects negative reps", () => {
    const schema = buildSubrowValuesSchema([
      baseField({ scope: "subrow", key: "sets", kind: "sets_array", required: true }),
    ]);
    expect(schema.safeParse({ sets: [{ weight: 80, reps: -1 }] }).success).toBe(false);
    expect(schema.safeParse({ sets: [{ weight: 80, reps: 8 }] }).success).toBe(true);
  });
});

describe("activityPayloadSchema", () => {
  const top = [baseField({ key: "notes", kind: "text" })];
  const sub = [baseField({ scope: "subrow", key: "sets", kind: "sets_array", required: true })];

  it("accepts minimal payload", () => {
    const schema = activityPayloadSchema(top, sub);
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      comment: null,
      tagIds: [],
      subrows: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts subrow with empty values (required is not enforced in the cross-type form)", () => {
    const schema = activityPayloadSchema(top, sub);
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      comment: null,
      tagIds: [],
      subrows: [{ exerciseId: null, values: {}, sortOrder: 0 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("activityPayloadSchema sprint kind", () => {
  it("accepts a sprint subrow", () => {
    const schema = activityPayloadSchema(
      [],
      [
        baseField({ scope: "subrow", key: "sprintDistance", kind: "number" }),
        baseField({ scope: "subrow", key: "sprintReps", kind: "number" }),
      ],
    );
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      tagIds: [],
      subrows: [
        { kind: "sprint", exerciseId: null, values: { sprintDistance: 100, sprintReps: 6 }, sortOrder: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("setEntrySchema perSide", () => {
  it("accepts perSide true", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10, perSide: true }).success).toBe(true);
  });
  it("accepts omitted perSide", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10 }).success).toBe(true);
  });
  it("rejects non-boolean perSide", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10, perSide: "yes" }).success).toBe(false);
  });
});
