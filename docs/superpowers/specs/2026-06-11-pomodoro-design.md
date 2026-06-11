# Pomodoro Page Design

Date: 2026-06-11
Status: Approved (brainstorm)

## Goal

Add a Pomodoro timer page under the Task Manager nav section. Pure client-side
timer (no DB persistence, no history, no stats). Timer state survives client
route navigation and reloads. Sidebar badge shows current phase + remaining time
while the timer is active.

## Non-goals

- No DB schema, server actions, or API routes.
- No session history, statistics, or productivity reports.
- No task linking (free-text "working on" label only).
- No auto-advance between phases.
- No mobile push, no keyboard shortcuts (deferred).

## User-visible behavior

- New route `/pomodoro`.
- Nav: appears in `Task Manager` group alongside Projects / Tasks / Calendar.
- Free-text input for "what you're working on" (label persisted with timer state).
- Three phases: `work`, `short_break`, `long_break`. After every
  `cyclesUntilLong` completed work phases, the break is a long break.
- After each phase ends: triple beep (WebAudio), optional browser notification
  (if permission granted), state goes to `ended`. User clicks `Start break` /
  `Start work` to begin the next phase.
- Controls: Start, Pause, Resume, Reset (current phase to full duration), Skip
  (advance to next phase without completing).
- Config panel (collapsible): work / short-break / long-break minutes,
  cyclesUntilLong. Persisted to `localStorage`.
- Document title shows `mm:ss · phase` while running.
- Sidebar badge visible whenever status is not `idle`; clicking it navigates to
  `/pomodoro`.

## Architecture

### State

```ts
type Phase = "work" | "short_break" | "long_break";
type Status = "idle" | "running" | "paused" | "ended";

type PomodoroConfig = {
  workMin: number;          // default 25
  shortMin: number;         // default 5
  longMin: number;          // default 15
  cyclesUntilLong: number;  // default 4
};

type PomodoroState = {
  phase: Phase;
  status: Status;
  startedAt: number | null;    // epoch ms when current run segment started
  elapsedBeforeStart: number;  // ms accumulated from prior pause segments this phase
  cycleCount: number;          // completed work phases since last long break
  label: string;
  config: PomodoroConfig;
};
```

### Timer math (wall-clock)

`remainingMs(state, now) = phaseDurationMs(state.phase, state.config) - (state.elapsedBeforeStart + (state.status === "running" ? now - state.startedAt : 0))`.

A `setInterval(250 ms)` only triggers re-render; arithmetic above is the source
of truth, so background-tab throttling cannot drift the clock.

When `remainingMs <= 0` and status is `running`: set status to `ended`, fire
beep + notification (once, guarded by a ref).

### Phase progression

Triggered by explicit user click on `Start <next>` after `ended`:

- After `work`: if `cycleCount + 1 >= cyclesUntilLong` → `long_break`, else `short_break`.
- After `short_break`: → `work`.
- After `long_break`: → `work`, reset `cycleCount` to 0.
- `cycleCount` increments when a `work` phase reaches `ended`.

### Persistence

- Key `pomodoro:state:v1` → full state JSON.
- Key `pomodoro:config:v1` → config JSON (also embedded in state; config key is
  the source of truth on hydrate).
- Hydration: on provider mount, read both. If state was `running`, recompute
  remaining with current `Date.now()`; if `<= 0`, snap to `ended`.

### Files

- `app/pomodoro/page.tsx` — server shell, renders client view.
- `app/pomodoro/_components/PomodoroView.tsx` — main UI (timer ring, label,
  controls, config panel toggle).
- `app/pomodoro/_components/ConfigPanel.tsx` — minute inputs + cyclesUntilLong.
- `lib/pomodoro/context.tsx` — `PomodoroProvider` + `usePomodoro()` hook.
  Mounted in `app/layout.tsx` so state survives route changes.
- `lib/pomodoro/timer.ts` — pure functions: `phaseDurationMs`, `remainingMs`,
  `nextPhase`, `defaultConfig`, `defaultState`.
- `lib/pomodoro/storage.ts` — SSR-safe localStorage read/write.
- `lib/pomodoro/sound.ts` — WebAudio triple beep. Lazy AudioContext init on
  first user gesture.
- `components/pomodoro-badge.tsx` — sidebar badge, mounted in
  `components/sidebar.tsx`. Renders only when status !== "idle".

### Nav integration

In `components/nav-tree.tsx`:

- Add `{ href: "/pomodoro", label: "Pomodoro", icon: Timer }` to `taskChildren`.
- Add `"/pomodoro"` to `taskPaths`.
- Extend `isTaskRoute` to recognise `/pomodoro` prefix.

### Notifications (optional)

`ConfigPanel` shows an "Enable notifications" button when
`Notification.permission === "default"`. On grant, `pomodoro:notify:v1` flag is
set to `true`. Phase-end handler fires `new Notification(...)` alongside beep
when flag is true and permission is `granted`.

## Testing

- `lib/pomodoro/timer.test.ts` (Vitest, no DOM):
  - `remainingMs` decreases linearly with injected `now`.
  - `remainingMs` for `paused` ignores wall-clock delta.
  - `nextPhase` honours `cyclesUntilLong` (3 short breaks then long, then
    cycleCount resets).
  - `defaultState` matches `defaultConfig` durations.
- `lib/pomodoro/storage.test.ts`: roundtrip save/load; corrupt JSON falls back
  to defaults.
- No component-level tests (UI thin; logic in pure helpers).
- Manual verify checklist:
  - Start → pause → resume → finish, ends at 0 with beep.
  - Click `Start break` after work end, then `Start work` after break.
  - Reset returns current phase to full duration, keeps cycleCount.
  - Skip advances to next phase without completing (does not increment
    `cycleCount` if skipping a work phase — see Edge cases).
  - Navigate to `/tasks` while running, badge visible, return to `/pomodoro`,
    timer continues.
  - Hard reload while running, state restored, remaining time correct.
  - Run a full 4-cycle sequence, confirm 4th break is long, then cycleCount=0.
  - Tab in background for >1 min, remaining time still accurate on return.
  - Sound plays after first user gesture (Start click).

## Edge cases

- Skip while running: jump to `ended` for current phase. Skipping a `work`
  phase does **not** increment `cycleCount` (only natural completion does), so
  Skip cannot trigger a long break.
- Reset while ended: clears `ended` back to `idle` for the same phase, full
  duration.
- Config edit while running: applies on next phase start; current phase keeps
  the duration it began with (`elapsedBeforeStart + startedAt` math is invariant
  under config edits because we cache phase duration at phase-start).
  Implementation note: store `phaseDurationMs` on the state when transitioning
  to running, or always derive from config but treat config edits during
  `running`/`paused` as deferred (apply on next `Start`). The deferred approach
  is simpler — pick that.
- Hydration with stale `ended` state: keep `ended`; user sees the prompt to
  start the next phase as if they had just walked back to the desk.
- SSR: `PomodoroProvider` initial state is the default; hydration effect runs
  client-side only.

## Out of scope (future work)

- Session history persisted to DB.
- Linking sessions to tasks.
- Daily / weekly stats UI.
- Keyboard shortcuts.
- Sound file customisation.
