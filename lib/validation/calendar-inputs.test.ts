import { expect, it } from "vitest";
import { createMealSchema } from "./meals";
import { upsertLogSchema } from "./habits";
import { createTravelSchema } from "./travels";
const id = "12345678-1234-4234-8234-123456789abc";
it("rejects nonexistent calendar dates before PostgreSQL errors", () => {
  for (const date of ["2026-02-30", "2026-13-01", "2026-00-10"]) {
    expect(createTravelSchema.safeParse({ name: "Trip", startDate: date }).success).toBe(false);
    expect(upsertLogSchema.safeParse({ habitId: id, date, count: 1 }).success).toBe(false);
    expect(createMealSchema.safeParse({ date, name: "Lunch", items: [{ foodId: id, grams: 100 }] }).success).toBe(false);
  }
});
it("accepts leap day only in leap years", () => {
  expect(createTravelSchema.safeParse({ name: "Trip", startDate: "2024-02-29" }).success).toBe(true);
  expect(createTravelSchema.safeParse({ name: "Trip", startDate: "2026-02-29" }).success).toBe(false);
});
