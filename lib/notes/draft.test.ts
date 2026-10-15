import { describe, expect, it } from "vitest";
import { createDraftStore } from "./draft";

function setup() {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
  return { storage, entries };
}
const isText = (value: unknown): value is string => typeof value === "string";
describe("durable note drafts", () => {
  it("retains failed edits across an editor remount", () => {
    const { storage } = setup();
    createDraftStore(storage, "note", "server", isText).persist("offline draft");
    expect(createDraftStore(storage, "note", "server", isText).recover()).toEqual({ value: "offline draft", conflict: false });
  });
  it("requires a recovery choice when the server has newer content", () => {
    const { storage } = setup();
    createDraftStore(storage, "note", "old server", isText).persist("draft");
    expect(createDraftStore(storage, "note", "new server", isText).recover()).toEqual({ value: "draft", conflict: true });
  });
  it("never clears a newer edit when an in-flight old snapshot is saved", () => {
    const { storage } = setup();
    const drafts = createDraftStore(storage, "note", "server", isText);
    drafts.persist("first");
    drafts.persist("latest");
    drafts.saved("first");
    expect(createDraftStore(storage, "note", "first", isText).recover()).toEqual({ value: "latest", conflict: false });
    drafts.saved("latest");
    expect(drafts.recover()).toBeNull();
  });
  it("discards stale drafts already present on the server and tolerates corrupt storage", () => {
    const { storage, entries } = setup();
    createDraftStore(storage, "note", "old", isText).persist("stored");
    expect(createDraftStore(storage, "note", "stored", isText).recover()).toBeNull();
    entries.set("note", "not json");
    expect(createDraftStore(storage, "note", "stored", isText).recover()).toBeNull();
  });
});
