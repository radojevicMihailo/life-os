import type { PomodoroConfig, PomodoroState } from "./types";

const STATE_KEY = "pomodoro:state:v1";
const CONFIG_KEY = "pomodoro:config:v1";
const NOTIFY_KEY = "pomodoro:notify:v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJSON<T>(key: string): T | null {
  const s = getStorage();
  if (!s) return null;
  const raw = s.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  const s = getStorage();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization failure — ignore */
  }
}

export function loadState(): PomodoroState | null {
  return readJSON<PomodoroState>(STATE_KEY);
}

export function saveState(state: PomodoroState): void {
  writeJSON(STATE_KEY, state);
}

export function loadConfig(): PomodoroConfig | null {
  return readJSON<PomodoroConfig>(CONFIG_KEY);
}

export function saveConfig(config: PomodoroConfig): void {
  writeJSON(CONFIG_KEY, config);
}

export function loadNotify(): boolean {
  return readJSON<boolean>(NOTIFY_KEY) ?? false;
}

export function saveNotify(value: boolean): void {
  writeJSON(NOTIFY_KEY, value);
}
