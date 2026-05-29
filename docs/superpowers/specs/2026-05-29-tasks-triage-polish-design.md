# Tasks Triage Polish — Design

Date: 2026-05-29
Status: approved
Scope: tasks module (`app/(tasks)`)

## Goal

Reduce triage friction on `/tasks`: grouping, sort, search. Bundle two cleanups that lower future-regression risk (subtask join, revalidation helper). One spec, one plan, one PR.

## Non-goals

Bulk operations, drag-reorder, fuzzy/trigram search, mobile hover-action fix, dark mode toggle, recurrence rewrite, optimistic updates, action-level test coverage.

## Schema

Add `rank` column to `priority`:

```ts
rank: integer("rank").notNull().default(1000),
```

Lower = higher priority. Ties allowed. Generate Drizzle migration via `pnpm db:generate`. Existing rows backfill to `1000` via default.

## URL params on `/tasks`

| Param      | Values                              | Default     | Source        |
|------------|-------------------------------------|-------------|---------------|
| `view`     | `grouped` \| `flat`                 | `grouped`   | server-read   |
| `sort`     | `smart` \| `due` \| `created` \| `title` | `smart` | server-read |
| `q`        | string                              | empty       | client-only   |
| `status`   | existing values                     | `active`    | existing      |
| `project`  | uuid                                | none        | existing      |
| `context`  | uuid                                | none        | existing      |
| `priority` | uuid                                | none        | existing      |

Invalid `view` → `grouped`. Invalid `sort` → `smart`.

## Server query — `lib/tasks-query.ts`

Extend `TaskFilters`:

```ts
export type TaskSort = "smart" | "due" | "created" | "title";

export type TaskFilters = {
  status?: TaskStatus | "active" | "all";
  projectId?: string;
  contextId?: string;
  priorityId?: string;
  parentTaskId?: string | null; // null = root tasks only; string = children of id
  sort?: TaskSort;
};
```

Behavior:
- `parentTaskId === null` → `isNull(task.parentTaskId)`.
- `parentTaskId === "<uuid>"` → `eq(task.parentTaskId, uuid)`.
- `parentTaskId` omitted → no constraint (preserves existing behavior for callers that don't set it).
- `sort` default `smart`.

Sort SQL (applied in `.orderBy(...)`):

- `smart`: `asc(priority.rank) nulls last, asc(task.dueAt) nulls last, desc(task.createdAt)`
- `due`: `asc(task.dueAt) nulls last, desc(task.createdAt)`
- `created`: `desc(task.createdAt)`
- `title`: `asc(task.title)`

Use Drizzle `sql` template for `nulls last` since drizzle-orm helpers may not expose it directly.

`/tasks` page passes `parentTaskId: null` so subtasks don't appear in the root list. (Currently they do — minor existing bug fixed as side effect.)

## Page wiring — `app/(tasks)/tasks/page.tsx`

`parseFilters` reads `view` and `sort` in addition to existing params. Passes `sort` and `parentTaskId: null` to `fetchTasks`. Passes `view`, `sort`, `query=""` (server doesn't read `q`) down to `TasksToolbar` + `TaskList`.

## New component — `TasksToolbar`

Client component, mounted above `<TaskList>`. Replaces nothing existing.

Contains:
- Search input (lucide `Search` icon). Value held in local state, synced to URL `q` via `replace` (not `push`) using `useRouter` + `useSearchParams`. Debounce 250ms.
- View toggle: two buttons "Grouped" / "Flat". Click updates URL `view` param.
- Sort `<Select>`: options Smart, Due date, Created, Title. Updates URL `sort` param.

All URL writes use `router.replace(pathname + "?" + sp.toString(), { scroll: false })`.

Search is client-only — no SSR for `q`. List filters happen in `TaskList`.

## TaskList changes

Props add: `view: "grouped" | "flat"`, `query: string` (lifted from toolbar via parent — see below).

Two integration options:
1. Lift `query` into `TasksPage` via React Context or pass-through. Since `TasksPage` is a server component and toolbar/list are both client, simplest: wrap both in a small client `TasksTriageShell` that owns `query` state and renders toolbar + list. Toolbar updates URL for `view`/`sort` but keeps `query` in component state (URL `q` for shareability is optional — drop URL sync if it complicates).
2. Pass `query` through URL only (initial value from `searchParams`, runtime via context).

**Decision: option 1.** New thin `TasksTriageShell` client component owns `query` state and renders `<TasksToolbar>` + `<TaskList>`. Server page passes `initialTasks`, `view`, `sort` props. `q` is component state only — not in URL. Simpler, no SSR mismatch.

Inside `TaskList`:
1. Filter by `query` (lowercase substring on `title + " " + (notes ?? "")`).
2. If `view === "flat"`: render single list, already server-sorted.
3. If `view === "grouped"`: pass filtered list to `groupBySection`, render sections in `sectionOrder` with `sectionLabels`. Empty sections hidden. Each section shows count.

## Section helper — `lib/task-sections.ts`

Verify existing exports cover: Overdue, Today, Tomorrow, This week, Later, No date. If current implementation differs:
- Adjust bucket boundaries using `date-fns`: `isPast(startOfDay(due))`, `isToday`, `isTomorrow`, `isThisWeek({weekStartsOn:1})`, else "Later"; null due → "No date".
- Done/canceled tasks present only when `status` filter includes them. They appear in their date bucket like everything else (no separate "Done" section in this iteration).

Sort within sections preserves server `sort` order.

## Priority UI

`PriorityForm` (`app/(tasks)/_components/PriorityForm.tsx`):
- Add numeric input `rank`. Label "Rank (lower = higher priority)". Default `1000`. Min `0`.
- Submit includes `rank` in payload.

`PriorityRow` (`app/(tasks)/_components/PriorityRow.tsx`):
- Display rank next to color swatch.
- Edit mode: rank editable.

`priorities` action (`app/(tasks)/_actions/priorities.ts`):
- `createPriority` + `updatePriority` accept `rank: number`. Validate via zod `z.number().int().min(0)`.

`PriorityFilter` query (`app/(tasks)/tasks/page.tsx`): order by `asc(priority.rank)` so dropdown lists by importance.

`TaskForm` priority select: same — order by rank.

`lib/validation/priorities.ts` (existing? if not, inline schema in action — current pattern). Add `rank` field.

## Subtask join cleanup

`app/(tasks)/tasks/[id]/page.tsx`:

Replace:
```ts
db.select().from(task).where(eq(task.parentTaskId, id)).orderBy(asc(task.createdAt))
```
with:
```ts
fetchTasks({ parentTaskId: id, status: "all", sort: "created" })
```

Remove the implicit `as TaskWithMeta` cheat that currently lets bare `Task` rows be passed to `<TaskRow>`. Subtask rows now show project/priority/context badges consistently.

## Revalidation helper

New file `app/(tasks)/_actions/_revalidate.ts`:

```ts
import { revalidatePath } from "next/cache";

export function revalidateTaskRoutes() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/(tasks)", "layout");
}
```

Replace inline `revalidatePath` calls in:
- `app/(tasks)/_actions/tasks.ts`
- `app/(tasks)/_actions/projects.ts`
- `app/(tasks)/_actions/contexts.ts`
- `app/(tasks)/_actions/priorities.ts`

with `revalidateTaskRoutes()`. Detail routes (`/tasks/[id]`, `/projects/[id]`) caught by the `(tasks)` layout-level revalidation.

## Error / edge cases

- Migration: defaulted `rank` = 1000 keeps existing data sortable.
- Empty `q` → no filter applied.
- `parentTaskId: null` on `/tasks` will hide subtasks from root list. If existing behavior expected subtasks in root, that's a deliberate fix (visible win for triage).
- Grouped + active filter: sections derived from currently visible tasks only. No flicker because grouping is pure client computation.
- Sort key for `priority.rank` requires the `priority` join — already present in `fetchTasks`. Use the joined column in `orderBy`.

## Testing

- Unit test `groupBySection` against fixed `Date.now()` baseline. Buckets: Overdue, Today, Tomorrow, This week, Later, No date. One task per bucket. Assert correct section assignment.
- Update `lib/recurrence.test.ts`-style co-location: `lib/task-sections.test.ts`.
- No action-level tests (deferred per scope decision).

## Files touched (estimate)

New:
- `app/(tasks)/_components/TasksToolbar.tsx`
- `app/(tasks)/_components/TasksTriageShell.tsx`
- `app/(tasks)/_actions/_revalidate.ts`
- `lib/task-sections.test.ts`
- `db/migrations/*` (auto-generated)

Modified:
- `db/schema/tasks.ts` — add `rank` to `priority`
- `lib/tasks-query.ts` — `sort`, `parentTaskId`, sort SQL
- `lib/task-sections.ts` — confirm/adjust buckets
- `app/(tasks)/tasks/page.tsx` — `view`/`sort` parse, toolbar/shell mount, `parentTaskId: null`
- `app/(tasks)/tasks/[id]/page.tsx` — subtask `fetchTasks` call
- `app/(tasks)/_components/TaskList.tsx` — grouped/flat + query filter
- `app/(tasks)/_components/PriorityForm.tsx` — rank input
- `app/(tasks)/_components/PriorityRow.tsx` — rank display/edit
- `app/(tasks)/_components/TaskForm.tsx` — priority select ordered by rank
- `app/(tasks)/_actions/priorities.ts` — accept `rank`
- `app/(tasks)/_actions/tasks.ts` — use revalidate helper
- `app/(tasks)/_actions/projects.ts` — use revalidate helper
- `app/(tasks)/_actions/contexts.ts` — use revalidate helper

## Open items (none blocking)

- If layout-level `revalidatePath("/(tasks)", "layout")` syntax differs in Next 16 — fall back to enumerating specific paths.
- If `groupBySection` current shape differs from required buckets, adjust in same PR.
