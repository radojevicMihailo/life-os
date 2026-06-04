# Habits — Design

## Purpose

Track recurring personal habits with two pages:

- **Overview & logging** (`/habits`) — today's scheduled habits with quick log + last 7 days grid + stats.
- **Create** (`/habits/new`) — form for new habit. Edit at `/habits/[id]/edit`. Manage list at `/habits/manage`.

## Schema

`db/schema/habits.ts`:

```ts
habitKindEnum: "binary" | "count"
habitCadenceEnum: "daily" | "weekly_target" | "weekdays"

habit:
  id uuid pk
  title text not null
  description text
  kind habitKindEnum not null default "binary"
  targetCount integer not null default 1     // applies to count
  unit text                                    // "glasses", "reps"... nullable for binary
  cadence habitCadenceEnum not null default "daily"
  weeklyTarget integer not null default 0      // applies to weekly_target
  weekdays integer not null default 127        // 7-bit mask Mon..Sun for weekdays cadence
  startDate date not null default current_date
  endDate date                                 // nullable
  archivedAt timestamp                         // nullable
  sortOrder integer not null default 0
  createdAt timestamp not null default now()
  updatedAt timestamp not null default now()

habit_log:
  id uuid pk
  habitId uuid fk(habit.id) on delete cascade
  date date not null                           // day-local
  count integer not null default 1             // 0 = explicit skip
  createdAt timestamp not null default now()
  unique(habitId, date)
```

Indexes: `habit_archived_idx ON archived_at`, `habit_log_habit_date_idx ON (habit_id, date)`.

Migration: `db/migrations/0013_habits.sql`. Register schema in `db/index.ts`.

## Validation (`lib/validation/habits.ts`)

Zod schemas: `createHabitSchema`, `updateHabitSchema`, `upsertLogSchema`. Refinements: `endDate >= startDate`; if kind=count then `targetCount >= 1` & `unit` optional but recommended; if cadence=weekly_target then `weeklyTarget >= 1`; if cadence=weekdays then `weekdays & 0x7F != 0`.

## Helpers

`lib/habits/schedule.ts`:
- `isScheduledOn(habit, date) -> boolean`
- `weekdayBit(date) -> number` (Mon=1, Sun=64; matches mask)
- `WEEKDAY_LABELS`, mask helpers.

`lib/habits/stats.ts`:
- `metOn(habit, log) -> boolean` — binary: log.count≥1; count: log.count≥targetCount; weekly: any log of that week with count≥1.
- `currentStreak(habit, logsByDate, today)` — for daily/weekdays counts consecutive scheduled days met up to today (skip non-scheduled). For weekly_target counts consecutive weeks where met-logs ≥ weeklyTarget, ending in current or previous week.
- `bestStreak(habit, logsByDate, earliestDate, today)`
- `completionPct30d(habit, logsByDate, today)` — met days / scheduled days in last 30d.

## Actions (`app/habits/_actions/`)

`_revalidate.ts`: `revalidatePath("/habits"); revalidatePath("/habits/manage")` + edit path.

`habits.ts`: `createHabit`, `updateHabit`, `archiveHabit`, `unarchiveHabit`, `deleteHabit`.

`logs.ts`: `upsertLog({ habitId, date, count })` — insert ... on conflict (habit_id,date) do update set count. `deleteLog({ habitId, date })`.

All actions return `ActionResult` (same shape as goals).

## Pages

- `app/habits/page.tsx` — fetch active (non-archived) habits + logs for last 7 days. Render: header w/ "+ New habit" + "Manage" link. Today list (scheduled today). 7-day grid below. Per-habit stats card row.
- `app/habits/new/page.tsx` — `<HabitForm mode="create" />`.
- `app/habits/[id]/edit/page.tsx` — load habit, render `<HabitForm mode="edit" habit={...} />`.
- `app/habits/manage/page.tsx` — list all habits with archive toggle.

## Components (`app/habits/_components/`)

- `HabitForm.tsx` — title, description, kind radio, conditional target+unit, cadence radio, conditional weeklyTarget input or weekday checkbox row, startDate, endDate (optional). Submit calls server action; toast on error; redirect to `/habits` on success.
- `HabitTodayRow.tsx` — title, streak badge, log control: binary = checkbox, count = number input with "x / target unit". Calls `upsertLog`.
- `HabitWeekGrid.tsx` — per-habit row of 7 day cells (oldest→today). Cell states: met (filled), partial (count, half), miss (empty bordered), not-scheduled (muted). Click cell to toggle for binary / open small input for count (stretch: just click-to-toggle binary; count cells read-only in grid).
- `HabitStatsCard.tsx` — current streak, best streak, 30d %.
- `HabitRow.tsx` — manage list row with edit link + archive/unarchive + delete.

## Nav

`Habits` leaf already exists in `components/nav-tree.tsx` (`/habits`). No change.

## Errors

- Zod fail → action returns `{ ok:false, error }`; client toast.
- DB constraint violation on log upsert avoided by ON CONFLICT.
- Date inputs as `Date` in client, converted to ISO date in action.

## Out of scope (YAGNI)

- Reminders/notifications.
- Tags/categories.
- Public sharing.
- Historical edits beyond 7-day grid (manage page can edit habit; logs editable by date via grid click).
