import { describe, expect, it } from "vitest";
import {
  createNoteSchema,
  updateNoteSchema,
  addItemSchema,
  reorderItemSchema,
} from "./notes";

describe("createNoteSchema", () => {
  it("accepts a title and defaults kind to free", () => {
    const r = createNoteSchema.safeParse({ title: "My note" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.kind).toBe("free");
  });

  it("rejects an empty title", () => {
    expect(createNoteSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("accepts kind todo", () => {
    const r = createNoteSchema.safeParse({ title: "List", kind: "todo" });
    expect(r.success).toBe(true);
  });
});

describe("updateNoteSchema", () => {
  it("requires a uuid id", () => {
    expect(updateNoteSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("accepts a partial body patch", () => {
    const r = updateNoteSchema.safeParse({
      id: "00000000-0000-0000-0000-000000000000",
      body: "# hi",
    });
    expect(r.success).toBe(true);
  });
});

describe("addItemSchema", () => {
  it("rejects empty text", () => {
    const r = addItemSchema.safeParse({
      noteId: "00000000-0000-0000-0000-000000000000",
      text: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("reorderItemSchema", () => {
  it("accepts up and down", () => {
    expect(
      reorderItemSchema.safeParse({
        id: "00000000-0000-0000-0000-000000000000",
        direction: "up",
      }).success,
    ).toBe(true);
  });

  it("rejects other directions", () => {
    expect(
      reorderItemSchema.safeParse({
        id: "00000000-0000-0000-0000-000000000000",
        direction: "sideways",
      }).success,
    ).toBe(false);
  });
});
