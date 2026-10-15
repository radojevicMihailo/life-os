import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "./autosave";

describe("note autosave", () => {
  afterEach(() => vi.useRealTimers());

  it("debounces typing and saves the latest value", async () => {
    vi.useFakeTimers();
    const values: string[] = [];
    const autosave = createAutosave(async (value: string) => { values.push(value); }, () => {});
    autosave.schedule("M");
    await vi.advanceTimersByTimeAsync(300);
    autosave.schedule("Mleko");
    await vi.advanceTimersByTimeAsync(499);
    expect(values).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(values).toEqual(["Mleko"]);
  });

  it("flushes before navigation and serializes edits arriving during a save", async () => {
    const values: string[] = [];
    let finish!: () => void;
    const first = new Promise<void>((resolve) => { finish = resolve; });
    const autosave = createAutosave(async (value: string) => {
      if (value === "first") await first;
      values.push(value);
    }, () => {});
    autosave.schedule("first");
    const saving = autosave.flush();
    autosave.schedule("latest");
    expect(values).toEqual([]);
    finish();
    expect(await saving).toBe(true);
    expect(values).toEqual(["first", "latest"]);
  });

  it("retains failed changes for an explicit retry", async () => {
    let offline = true;
    let stored = "old";
    const autosave = createAutosave(async (value: string) => {
      if (offline) throw new Error("offline");
      stored = value;
    }, () => {});
    autosave.schedule("new");
    expect(await autosave.flush()).toBe(false);
    expect(stored).toBe("old");
    offline = false;
    expect(await autosave.flush()).toBe(true);
    expect(stored).toBe("new");
  });
});

it("tracks pending and in-flight changes until the latest snapshot is stored", async () => {
  let finish!: () => void;
  const saving = new Promise<void>((resolve) => { finish = resolve; });
  const autosave = createAutosave(async () => saving, () => {});
  expect(autosave.isDirty()).toBe(false);
  autosave.schedule("changed");
  expect(autosave.isDirty()).toBe(true);
  const flushed = autosave.flush();
  expect(autosave.isDirty()).toBe(true);
  finish();
  await flushed;
  expect(autosave.isDirty()).toBe(false);
});

it("retries the latest edit when an older in-flight write fails", async () => {
  let reject!: (error: Error) => void;
  const first = new Promise<void>((_, rejectPromise) => { reject = rejectPromise; });
  const values: string[] = [];
  const autosave = createAutosave(async (value: string) => {
    if (value === "old") await first;
    values.push(value);
  }, () => {});
  autosave.schedule("old");
  const flushed = autosave.flush();
  autosave.schedule("new");
  reject(new Error("offline"));
  expect(await flushed).toBe(false);
  expect(await autosave.flush()).toBe(true);
  expect(values).toEqual(["new"]);
});
