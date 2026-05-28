# Life-OS Task Manager — Design

**Date:** 2026-05-28
**Status:** Approved (design phase)
**Module:** Task Manager (first module of Life-OS)

## Purpose

Life-OS is a personal web app for tracking every part of life. The task manager is the first module. It must work standalone and leave room for additional modules (habits, finance, journal, etc.) to be added later without restructuring.

## Goals

- Personal task manager covering: due dates, priority, tags, projects, subtasks, recurring tasks.
- Single user, local development first, no auth.
- Modular layout in the codebase so future life-os modules slot in cleanly.
- Server-rendered, low ceremony stack.

## Non-Goals (v1)

- Authentication, multi-user, sharing.
- Cloud hosting / deployment.
- Mobile-first UI polish (basic responsive only).
- Notifications / reminders.
- Natural-language quick-add parsing.
- Drag-to-reorder, keyboard shortcuts, undo.
- Soft delete.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL 16 (local via Docker Compose)
- Drizzle ORM + drizzle-kit migrations
- Zod for validation (shared client + server)
- Vitest for unit tests (pure logic)
- date-fns for date utilities

## Architecture

### Modular layout via App Router route groups

Single Next.js app. Each life-os module lives under a route group. Task manager occupies `app/(tasks)/...`. Future modules add their own route groups (`app/(habits)/...`, etc.) without touching the task module.

Shared shell (`app/layout.tsx`) renders sidebar nav listing available modules. Sidebar entries are statically declared per module today; a registry can be added later if module count grows.

### Server boundaries

- Reads: React Server Components query Drizzle directly.
- Mutations: Server Actions colocated per module (`app/(tasks)/_actions/`).
- No REST/GraphQL layer in v1.
- `revalidatePath` after each mutation that affects a known route.

### Validation

- Zod schemas in `lib/validation/tasks.ts`.
- Same schema used by form (client) and action entry (server).
- Server actions return `{ ok: true, data } | { ok: false, error }`. Form surfaces error via shadcn toast.

### State

- URL search params hold list filters (status, project, tag, priority).
- No global client store. Local component state for form drafts and dialogs only.

## Data Model (Drizzle, Postgres)

Schema file: `db/schema/tasks.ts`. Tables live under the default `public` schema; names are unprefixed within the task module file. Future modules use their own schema files.

### `project`

| column        | type          | notes                        |
| ------------- | ------------- | ---------------------------- |
| `id`          | uuid pk       |                              |
| `name`        | text not null |                              |
| `parent_id`   | uuid null     | self-ref, optional subprojects |
| `archived_at` | timestamptz null |                          |
| `created_at`  | timestamptz default now() |                  |
| `updated_at`  | timestamptz default now() |                  |

### `task`

| column                  | type           | notes                                   |
| ----------------------- | -------------- | --------------------------------------- |
| `id`                    | uuid pk        |                                         |
| `title`                 | text not null  |                                         |
| `notes`                 | text null      |                                         |
| `project_id`            | uuid null      | → `project.id`                          |
| `parent_task_id`        | uuid null      | → `task.id`, subtasks                   |
| `priority`              | smallint       | 0 none, 1 low, 2 med, 3 high            |
| `due_at`                | timestamptz null |                                       |
| `completed_at`          | timestamptz null | null = open                           |
| `recurrence`            | jsonb null     | `{freq, interval, byweekday?}`          |
| `recurrence_parent_id`  | uuid null      | → `task.id`, links instance → template  |
| `sort_order`            | integer        | manual ordering within scope            |
| `created_at`            | timestamptz default now() |                              |
| `updated_at`            | timestamptz default now() |                              |

### `tag`

| column   | type         | notes |
| -------- | ------------ | ----- |
| `id`     | uuid pk      |       |
| `name`   | text unique  |       |
| `color`  | text null    |       |

### `task_tag` (join)

| column    | type | notes              |
| --------- | ---- | ------------------ |
| `task_id` | uuid | → `task.id`        |
| `tag_id`  | uuid | → `tag.id`         |

Primary key `(task_id, tag_id)`.

### Indexes

- `task(completed_at)`
- `task(due_at)`
- `task(project_id)`
- `task_tag(tag_id)`

### Recurrence strategy

- Recurrence rule stored as JSON on the template task.
- Pure function `nextOccurrence(rule, fromDate): Date` in `lib/recurrence.ts`.
- When a recurring template is completed via `toggleTask`, the action inserts a new instance with `recurrence_parent_id` pointing at the template; the template itself stays open or remains as the canonical rule (template is never marked complete — the action creates a completed instance instead and advances the template's `due_at` to the next occurrence).
- Decision: template is the live, advancing task. Each completion produces a historical completed row with `recurrence_parent_id` set, and the template's `due_at` advances.

## Routes

- `/` — dashboard: Today, Overdue, Upcoming (next 7 days).
- `/tasks` — full task list, filterable via search params (`?status=open&project=...&tag=...&priority=...`).
- `/tasks/[id]` — task detail (notes, subtasks, recurrence).
- `/projects` — project list.
- `/projects/[id]` — project view, scoped task list.
- `/tags` — tag management.

## UI Components

Location: `app/(tasks)/_components/`. Shared primitives from shadcn live in `components/ui/`.

- `TaskList` — server component, accepts filter, groups rows by section (Overdue, Today, Upcoming, No date).
- `TaskRow` — checkbox, title, due chip, priority dot, tag pills, project label.
- `TaskForm` — create/edit dialog.
- `QuickAdd` — top-bar input, plain title only in v1.
- `ProjectSidebar` — module-local sidebar showing projects.
- `TagFilter` — filter pill row.
- `RecurrenceEditor` — freq + interval picker (daily / weekly / monthly + interval + optional byweekday).

### Layout

- Left sidebar: Dashboard, Tasks, Projects, Tags. Future modules slot below.
- Top bar: quick-add input.
- Main: filtered list grouped by section.

### Interactions

- Toggle complete → server action, optimistic update on the row.
- Drag reorder: out of scope v1 (`sort_order` column reserved for it).
- Keyboard shortcuts: out of scope v1.

### States

- Empty: prompt with primary CTA ("Add your first task").
- Loading: skeleton rows via Suspense.
- Error: shadcn alert with retry.

## Server Actions

Location: `app/(tasks)/_actions/`.

- `createTask(input)` — title required; optional project, due, priority, tags, recurrence.
- `updateTask(id, patch)`.
- `toggleTask(id)` — set/clear `completed_at`; for recurring template, spawn historical completed instance and advance template's `due_at`.
- `deleteTask(id)` — hard delete, no undo in v1.
- `reorderTasks(ids[])` — bulk `sort_order` update.
- `createProject`, `updateProject`, `archiveProject`.
- `createTag`, `deleteTag`, `attachTag(taskId, tagId)`, `detachTag(taskId, tagId)`.

All actions:

- Parse input through Zod schema first.
- Run inside a single transaction where multiple rows are touched.
- Call `revalidatePath` for affected routes.

## Repository Layout

```
app/
  layout.tsx
  page.tsx                       # dashboard
  (tasks)/
    tasks/page.tsx
    tasks/[id]/page.tsx
    projects/page.tsx
    projects/[id]/page.tsx
    tags/page.tsx
    _components/
    _actions/
components/
  ui/                            # shadcn
db/
  index.ts                       # drizzle client
  schema/
    tasks.ts
  migrations/
lib/
  validation/
    tasks.ts
  recurrence.ts
  utils.ts
docker-compose.yml
drizzle.config.ts
.env.local
```

## Setup

- `pnpm create next-app` — TS, App Router, Tailwind.
- Add deps: `drizzle-orm`, `drizzle-kit`, `pg`, `zod`, `date-fns`, `shadcn-ui` (init).
- `docker-compose.yml` defines a `postgres:16` service exposing 5432.
- `.env.local` — `DATABASE_URL=postgres://...localhost:5432/lifeos`.
- Scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`.

## Testing

- Vitest for pure logic:
  - `lib/recurrence.ts` — covers daily/weekly/monthly, interval, byweekday.
  - `lib/validation/tasks.ts` — accepts valid input, rejects invalid.
- No DB mocking in v1. Server-action tests can be added later against an ephemeral test database.
- Playwright e2e: out of scope v1.

## Risks / Open Questions

- Recurrence template-vs-instance model: chosen approach (template advances, instances are historical) is simple but means "completion history" requires querying the instance rows. Acceptable.
- Subtasks rendering nested arbitrarily deep is not in v1 — UI shows one level of children under a task.
- Hard delete with no undo could surprise the user. Acceptable for v1 single user; revisit if missed.
