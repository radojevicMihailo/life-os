// lib/pomodoro/context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Phase, PomodoroConfig, PomodoroState, Status } from "./types";
import {
  defaultState,
  nextPhase as computeNextPhase,
  phaseDurationMs,
  remainingMs,
  formatRemaining,
} from "./timer";
import {
  loadConfig,
  loadNotify,
  loadState,
  saveConfig,
  saveNotify,
  saveState,
} from "./storage";
import { playPhaseEndCue } from "./sound";

const PHASE_LABEL: Record<Phase, string> = {
  work: "Work",
  short_break: "Short break",
  long_break: "Long break",
};

type Actions = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  startNextPhase: () => void;
  setLabel: (label: string) => void;
  setConfig: (patch: Partial<PomodoroConfig>) => void;
  setNotify: (value: boolean) => void;
  requestNotificationPermission: () => Promise<void>;
};

type Ctx = {
  state: PomodoroState;
  remaining: number;
  remainingLabel: string;
  notifyEnabled: boolean;
  pendingConfig: PomodoroConfig | null;
} & Actions;

const PomodoroContext = createContext<Ctx | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(() => defaultState());
  const [notifyEnabled, setNotifyEnabledState] = useState<boolean>(false);
  const [pendingConfig, setPendingConfig] = useState<PomodoroConfig | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const endedFiredFor = useRef<string>("");
  const hydrated = useRef(false);

  // Hydrate once — deferred via setTimeout to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (hydrated.current) return;
    const id = window.setTimeout(() => {
      const storedConfig = loadConfig();
      const storedState = loadState();
      const storedNotify = loadNotify();
      setNotifyEnabledState(storedNotify);
      if (storedState) {
        const merged: PomodoroState = {
          ...storedState,
          config: storedConfig ?? storedState.config,
        };
        setState(merged);
      } else if (storedConfig) {
        setState((s) => ({ ...s, config: storedConfig }));
      }
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated.current) return;
    saveState(state);
    saveConfig(state.config);
  }, [state]);

  // Ticker — only when running.
  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const r = remainingMs(state, now);
      if (r <= 0) {
        const key = `${state.phase}:${state.startedAt}`;
        if (endedFiredFor.current !== key) {
          endedFiredFor.current = key;
          playPhaseEndCue();
          maybeNotify(state.phase, notifyEnabled);
        }
        setState((s) =>
          s.status === "running"
            ? {
                ...s,
                status: "ended",
                elapsedBeforeStart: phaseDurationMs(s.phase, s.config),
                startedAt: null,
              }
            : s,
        );
      } else {
        setNowTick(now);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [state, notifyEnabled]);

  // Document title.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const r = remainingMs(state, nowTick);
    if (state.status === "running" || state.status === "paused") {
      document.title = `${formatRemaining(r)} · ${PHASE_LABEL[state.phase]} — Life OS`;
    } else if (state.status === "ended") {
      document.title = `Phase ended — Life OS`;
    } else {
      document.title = "Life OS";
    }
    return () => {
      document.title = "Life OS";
    };
  }, [state, nowTick]);

  const start = useCallback(() => {
    setState((s) => {
      if (s.status === "running") return s;
      return {
        ...s,
        status: "running",
        startedAt: Date.now(),
        elapsedBeforeStart: 0,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.status !== "running" || s.startedAt === null) return s;
      const delta = Date.now() - s.startedAt;
      return {
        ...s,
        status: "paused",
        elapsedBeforeStart: s.elapsedBeforeStart + delta,
        startedAt: null,
      };
    });
  }, []);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.status !== "paused") return s;
      return { ...s, status: "running", startedAt: Date.now() };
    });
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({
      ...s,
      status: "idle",
      startedAt: null,
      elapsedBeforeStart: 0,
    }));
    endedFiredFor.current = "";
  }, []);

  const advance = useCallback(
    (s: PomodoroState, naturalCompletion: boolean): PomodoroState => {
      const next = computeNextPhase(s);
      const completedWork = naturalCompletion && s.phase === "work";
      const completedLong = naturalCompletion && s.phase === "long_break";
      const cycleCount = completedLong
        ? 0
        : completedWork
          ? s.cycleCount + 1
          : s.cycleCount;
      const config = pendingConfig ?? s.config;
      return {
        ...s,
        phase: next,
        status: "idle",
        startedAt: null,
        elapsedBeforeStart: 0,
        cycleCount,
        config,
      };
    },
    [pendingConfig],
  );

  const skip = useCallback(() => {
    setState((s) => advance(s, false));
    setPendingConfig(null);
    endedFiredFor.current = "";
  }, [advance]);

  const startNextPhase = useCallback(() => {
    setState((s) => {
      const advanced = advance(s, true);
      return {
        ...advanced,
        status: "running",
        startedAt: Date.now(),
        elapsedBeforeStart: 0,
      };
    });
    setPendingConfig(null);
    endedFiredFor.current = "";
  }, [advance]);

  const setLabel = useCallback((label: string) => {
    setState((s) => ({ ...s, label }));
  }, []);

  const setConfig = useCallback(
    (patch: Partial<PomodoroConfig>) => {
      setState((s) => {
        const merged: PomodoroConfig = { ...s.config, ...patch };
        if (s.status === "running" || s.status === "paused") {
          setPendingConfig(merged);
          return s;
        }
        setPendingConfig(null);
        return { ...s, config: merged };
      });
    },
    [],
  );

  const setNotify = useCallback((value: boolean) => {
    setNotifyEnabledState(value);
    saveNotify(value);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setNotify(true);
    }
  }, [setNotify]);

  const remaining = remainingMs(state, nowTick);
  const remainingLabel = formatRemaining(remaining);

  const value = useMemo<Ctx>(
    () => ({
      state,
      remaining,
      remainingLabel,
      notifyEnabled,
      pendingConfig,
      start,
      pause,
      resume,
      reset,
      skip,
      startNextPhase,
      setLabel,
      setConfig,
      setNotify,
      requestNotificationPermission,
    }),
    [
      state,
      remaining,
      remainingLabel,
      notifyEnabled,
      pendingConfig,
      start,
      pause,
      resume,
      reset,
      skip,
      startNextPhase,
      setLabel,
      setConfig,
      setNotify,
      requestNotificationPermission,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): Ctx {
  const v = useContext(PomodoroContext);
  if (!v) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return v;
}

export function phaseLabel(phase: Phase): string {
  return PHASE_LABEL[phase];
}

export function phaseLabelByStatus(state: PomodoroState): string {
  return PHASE_LABEL[state.phase];
}

export type { Status };

function maybeNotify(phase: Phase, enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const title =
    phase === "work" ? "Work phase complete" : "Break complete";
  const body =
    phase === "work" ? "Take a break." : "Back to work.";
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
