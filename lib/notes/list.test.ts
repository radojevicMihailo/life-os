import { describe, expect, it } from "vitest";
import { noteListFilters, noteListHref, escapeNoteSearch } from "./list";

describe("note list filters", () => {
  it("treats SQL wildcards and backslashes as literal search text", () => {
    expect(escapeNoteSearch("50%_\\off")).toBe("50\\%\\_\\\\off");
  });
  it("normalizes untrusted pagination and category values", () => {
    expect(noteListFilters({ q: "  mleko  ", page: "-5", category: "bad" })).toEqual({ query: "mleko", page: 1, category: "all" });
    expect(noteListFilters({ page: "2.5" }).page).toBe(1);
    expect(noteListFilters({ page: ["8"] }).page).toBe(1);
  });
  it("preserves search and category when loading another bounded page", () => {
    const category = "123e4567-e89b-42d3-a456-426614174000";
    const filters = noteListFilters({ q: "mleko & hleb", category, page: "3" });
    const url = new URL(noteListHref(filters, 4), "https://local.test");
    expect(url.searchParams.get("q")).toBe("mleko & hleb");
    expect(url.searchParams.get("category")).toBe(category);
    expect(url.searchParams.get("page")).toBe("4");
  });
});
