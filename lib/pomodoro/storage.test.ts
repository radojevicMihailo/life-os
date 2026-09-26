import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState, loadConfig, saveConfig, loadNotify, saveNotify } from "./storage";
import { defaultState, defaultConfig } from "./timer";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key() { return null; }
  get length() { return this.map.size; }
}

beforeEach(() => {
  const memStorage = new MemoryStorage();
  const g = globalThis as unknown as {
    window: { localStorage: MemoryStorage };
    localStorage: MemoryStorage;
  };
  g.window = { localStorage: memStorage };
  g.localStorage = memStorage;
});

describe("state storage", () => {
  it("returns null when nothing stored", () => {
    expect(loadState()).toBeNull();
  });

  it("roundtrips state", () => {
    const s = { ...defaultState(), taskId: "task-123", label: "writing spec" };
    saveState(s);
    expect(loadState()).toEqual(s);
  });

  it("keeps a saved timer from before task selection was added", () => {
    globalThis.localStorage.setItem("pomodoro:state:v2", JSON.stringify({ ...defaultState(), taskId: undefined, label: "writing spec" }));
    expect(loadState()).toMatchObject({ taskId: null, label: "writing spec", phase: "work" });
  });

  it("returns null on corrupt JSON", () => {
    globalThis.localStorage.setItem("pomodoro:state:v2", "{not json");
    expect(loadState()).toBeNull();
  });

  it("does not restore a timer with the old cycle-based settings", () => {
    globalThis.localStorage.setItem("pomodoro:state:v1", JSON.stringify({ ...defaultState(), phase: "long_break" }));
    globalThis.localStorage.setItem("pomodoro:config:v1", JSON.stringify({ workMin: 25, shortMin: 5, longMin: 15, cyclesUntilLong: 4 }));
    expect(loadState()).toBeNull();
    expect(loadConfig()).toBeNull();
  });
});

describe("config storage", () => {
  it("roundtrips config", () => {
    const c = { ...defaultConfig(), workMin: 50 };
    saveConfig(c);
    expect(loadConfig()).toEqual(c);
  });
});

describe("notify flag", () => {
  it("defaults to false when unset", () => {
    expect(loadNotify()).toBe(false);
  });

  it("roundtrips true", () => {
    saveNotify(true);
    expect(loadNotify()).toBe(true);
  });
});
