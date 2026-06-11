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
  (globalThis as any).window = { localStorage: memStorage };
  (globalThis as any).localStorage = memStorage;
});

describe("state storage", () => {
  it("returns null when nothing stored", () => {
    expect(loadState()).toBeNull();
  });

  it("roundtrips state", () => {
    const s = { ...defaultState(), label: "writing spec" };
    saveState(s);
    expect(loadState()).toEqual(s);
  });

  it("returns null on corrupt JSON", () => {
    globalThis.localStorage.setItem("pomodoro:state:v1", "{not json");
    expect(loadState()).toBeNull();
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
