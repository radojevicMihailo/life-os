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
import type { Phase, PomodoroConfig, PomodoroState } from "./types";
import {
  advancePhase,
  defaultState,
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
import { playPhaseEndCue, preparePhaseEndCue } from "./sound";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PHASE_LABEL: Record<Phase, string> = {
  work: "Work",
  break: "Break",
};

type Actions = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  finishPhase: () => void;
  setTaskId: (taskId: string | null) => void;
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
} & Actions;

const PomodoroContext = createContext<Ctx | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(() => defaultState());
  const [notifyEnabled, setNotifyEnabledState] = useState<boolean>(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [finishedPhase, setFinishedPhase] = useState<Phase | null>(null);
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
          setFinishedPhase(state.phase);
        }
        setState((s) =>
          s.status === "running"
            ? advancePhase(s)
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
    if (finishedPhase) {
      document.title = `${PHASE_LABEL[finishedPhase]} session finished — Life OS`;
    } else if (state.status === "running" || state.status === "paused") {
      document.title = `${formatRemaining(r)} · ${PHASE_LABEL[state.phase]} — Life OS`;
    } else {
      document.title = "Life OS";
    }
    return () => {
      document.title = "Life OS";
    };
  }, [state, nowTick, finishedPhase]);

  const start = useCallback(() => {
    preparePhaseEndCue();
    setState((s) => {
      if (s.status !== "idle") return s;
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
    preparePhaseEndCue();
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

  const finishPhase = useCallback(() => {
    setState((s) => s.status === "idle" ? s : advancePhase(s));
    endedFiredFor.current = "";
  }, []);

  const setLabel = useCallback((label: string) => {
    setState((s) => ({ ...s, label }));
  }, []);

  const setTaskId = useCallback((taskId: string | null) => {
    setState((s) => ({ ...s, taskId }));
  }, []);

  const setConfig = useCallback((patch: Partial<PomodoroConfig>) => {
    setState((s) => s.status === "idle"
      ? { ...s, config: { ...s.config, ...patch } }
      : s);
  }, []);

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
      start,
      pause,
      resume,
      reset,
      finishPhase,
      setTaskId,
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
      start,
      pause,
      resume,
      reset,
      finishPhase,
      setTaskId,
      setLabel,
      setConfig,
      setNotify,
      requestNotificationPermission,
    ],
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      <Dialog open={finishedPhase !== null}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {finishedPhase === "work" ? "Work session finished" : "Break finished"}
            </DialogTitle>
            <DialogDescription>
              {finishedPhase === "work"
                ? "Your break timer is ready. Set the break length and start it when you are ready."
                : "Your work timer is ready. Start it when you are ready to continue."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFinishedPhase(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): Ctx {
  const v = useContext(PomodoroContext);
  if (!v) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return v;
}

export function phaseLabel(phase: Phase): string {
  return PHASE_LABEL[phase];
}

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
