import { describe, it, expect } from "vitest";
import { buildBreakdown } from "./buildBreakdown";

const rows = [
  { kind: "expense" as const, categoryId: "c1", categoryName: "Food", subcategoryId: "s1", subcategoryName: "Groceries", eur: 100 },
  { kind: "expense" as const, categoryId: "c1", categoryName: "Food", subcategoryId: "s2", subcategoryName: "Restaurants", eur: 50 },
  { kind: "expense" as const, categoryId: "c2", categoryName: "Rent",  subcategoryId: null, subcategoryName: null, eur: 800 },
  { kind: "income" as const,  categoryId: "c3", categoryName: "Salary", subcategoryId: null, subcategoryName: null, eur: 3000 },
];

describe("buildBreakdown", () => {
  it("nests subcategories under categories", () => {
    const res = buildBreakdown(rows);
    const food = res.find((r) => r.categoryId === "c1");
    expect(food?.total).toBe(150);
    expect(food?.subRows).toHaveLength(2);
  });

  it("sorts categories by total descending", () => {
    const res = buildBreakdown(rows).filter((r) => r.kind === "expense");
    expect(res.map((r) => r.categoryId)).toEqual(["c2", "c1"]);
  });

  it("sorts subRows by total descending", () => {
    const res = buildBreakdown(rows);
    const food = res.find((r) => r.categoryId === "c1");
    expect(food?.subRows.map((s) => s.subcategoryId)).toEqual(["s1", "s2"]);
  });

  it("uses '(bez podkategorije)' label when subcategoryName is null", () => {
    const res = buildBreakdown(rows);
    const rent = res.find((r) => r.categoryId === "c2");
    expect(rent?.subRows[0]?.subcategoryName).toBe("(bez podkategorije)");
  });

  it("separates income and expense kinds", () => {
    const res = buildBreakdown(rows);
    expect(res.filter((r) => r.kind === "income")).toHaveLength(1);
    expect(res.filter((r) => r.kind === "expense")).toHaveLength(2);
  });

  it("returns empty array when no rows", () => {
    expect(buildBreakdown([])).toEqual([]);
  });
});
