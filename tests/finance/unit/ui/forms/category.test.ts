import { describe, expect, it } from "vitest";

import { parseCategoryForm } from "@/modules/finance/ui/forms/category";

describe("category forms", () => {
  it("accepts trimmed income and expense category names", () => {
    expect(parseCategoryForm({ name: "  Hrana ", classification: "expense" }))
      .toEqual({ name: "Hrana", classification: "expense" });
  });

  it("rejects an unsupported classification", () => {
    expect(() => parseCategoryForm({ name: "Hrana", classification: "asset" })).toThrow();
  });
});
