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
