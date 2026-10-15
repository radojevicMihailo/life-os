import { describe, expect, it } from "vitest";
import { createPendingAddDraft } from "./pending-adds";

function setup() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
}
describe("durable shopping additions", () => {
  it("preserves a staged addition across navigation without automatically submitting it", () => {
    const storage = setup();
    const first = createPendingAddDraft(storage, "note");
    first.stage("request-1", "Sir");
    expect(createPendingAddDraft(storage, "note").snapshot()).toEqual({ input: "", additions: [{ id: "request-1", text: "Sir" }] });
  });
  it("removes only a confirmed or explicitly discarded addition", () => {
    const storage = setup();
    const draft = createPendingAddDraft(storage, "note");
    draft.stage("first", "Mleko");
    draft.stage("second", "Hleb");
    draft.remove("first");
    expect(createPendingAddDraft(storage, "note").snapshot().additions).toEqual([{ id: "second", text: "Hleb" }]);
    draft.remove("second");
    expect(createPendingAddDraft(storage, "note").snapshot().additions).toEqual([]);
  });
  it("retains unsent input alongside uncertain additions and deduplicates retries by request ID", () => {
    const storage = setup();
    const draft = createPendingAddDraft(storage, "note");
    draft.setInput("Jaja");
    draft.stage("retry", "Sir");
    draft.stage("retry", "Sir");
    expect(createPendingAddDraft(storage, "note").snapshot()).toEqual({ input: "Jaja", additions: [{ id: "retry", text: "Sir" }] });
  });
});

it("an old request acknowledgment preserves additions and input from a newer editor instance", () => {
  const storage = setup();
  const oldEditor = createPendingAddDraft(storage, "note");
  oldEditor.stage("request-a", "Sir");
  const reopenedEditor = createPendingAddDraft(storage, "note");
  reopenedEditor.stage("request-b", "Mleko");
  reopenedEditor.setInput("Jogurt još nije poslat");
  oldEditor.remove("request-a");
  expect(createPendingAddDraft(storage, "note").snapshot()).toEqual({
    input: "Jogurt još nije poslat", additions: [{ id: "request-b", text: "Mleko" }],
  });
});

it("retains a usable in-memory draft when browser storage cannot be written", () => {
  const backing = setup();
  const storage = { ...backing, setItem() { throw new Error("storage full"); }, removeItem() { throw new Error("storage unavailable"); } };
  const draft = createPendingAddDraft(storage, "note");
  draft.stage("request", "Sir");
  draft.setInput("Mleko");
  expect(draft.snapshot()).toEqual({ input: "Mleko", additions: [{ id: "request", text: "Sir" }] });
});
