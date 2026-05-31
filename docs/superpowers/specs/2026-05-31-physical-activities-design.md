# Physical Activities Module — Design

**Date:** 2026-05-31
**Status:** Approved (design phase)
**Module:** Physical Activities (second module of Life OS)

## Purpose

Second module of Life OS. Personal logging of workouts and activities (gym, running, future modalities), with a schema-driven configuration layer so the user can shape what gets recorded per modality. Activities are documented in a structured form; Plans hold workout templates for reference.

## Goals

- Three top-level sections: **Configuration**, **Activities**, **Plans**.
- Configuration page: define modalities, per-modality categories, exercises grouped by category, and the field schema used by activities and plans for that modality.
- Activities page: log and review sessions. Each session uses its modality's configured fields plus optional repeating subrows (e.g. exercises with sets, run splits) and a free-form comment.
- Plans page: per-modality templates with structured planned subrows plus free-form markdown notes. Pure reference — no automatic prefill into activities.
- Match the existing Task Manager module's stack and conventions.

## Non-Goals (v1)

- Auth, multi-user.
- Charts, dashboards, personal record auto-detection.
- Drag-reorder (use sort_order + up/down buttons).
- Import from Strava / Apple Health.
- Cross-modality plans.
- Plan → activity prefill.
- Auto pace computation (user enters distance, time, pace independently).
- User-defined field kinds beyond the fixed enum.
- Soft delete of activities (hard delete only; archive applies to modality, exercise, plan).
- Notifications, scheduling.

## Stack

Reuse Task Manager stack:

- Next.js 15 (App Router) + TypeScript
- Tailwind + shadcn/ui
- PostgreSQL 16 (local via Docker Compose)
- Drizzle ORM + drizzle-kit migrations
- Zod for validation (shared client + server)
- Vitest for pure-logic tests
- date-fns for date utilities

## Architecture

### Route group

```
app/(physical)/
  configuration/page.tsx
  configuration/[modalityId]/page.tsx
  activities/page.tsx
  activities/new/page.tsx
  activities/[id]/page.tsx
  plans/page.tsx
  plans/[id]/page.tsx
  _actions/
    modalities.ts
    fields.ts
    categories.ts
    exercises.ts
    activities.ts
    plans.ts
  _components/
    ModalityForm.tsx
    FieldEditor.tsx
    CategoryEditor.tsx
    ExerciseEditor.tsx
    DynamicActivityForm.tsx
    SubrowEditor.tsx
    SetArrayInput.tsx
    ActivityList.tsx
    PlanForm.tsx
```

Schema: `db/schema/physical.ts`. Validation: `lib/validation/physical.ts`. Pure logic: `lib/physical/`.

### Sidebar

Convert the existing `Physical Activities` leaf in `components/nav-tree.tsx` into a group with children **Configuration**, **Activities**, **Plans**, mirroring the Task Manager group. Add a `isPhysicalRoute` helper for active state.

### Server boundaries

- Reads: React Server Components query Drizzle directly.
- Mutations: Server Actions colocated per module under `app/(physical)/_actions/`.
- No REST/GraphQL layer.
- `revalidatePath` after each mutation affecting a known route.
- Replace-subrows-in-tx pattern for activities and plans: delete all existing subrows, insert new set.

### Validation

- Zod schemas built dynamically from a modality's field definitions in `lib/validation/physical.ts`.
- Same schema is used by the client form and the server action.
- Actions return `{ ok: true, data } | { ok: false, error }`. Errors surface via shadcn toast.

### State

- URL search params hold list filters (modality, date range, exercise, category).
- No global client store. Local component state for form drafts and dialogs.

## Data Model (Drizzle, Postgres)

All UUID primary keys; `created_at` / `updated_at` timestamptz default `now()`. Schema file `db/schema/physical.ts`.

### `modality`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null unique | e.g. "Gym", "Running" |
| sort_order | int default 0 | |
| archived_at | timestamptz null | |
| created_at, updated_at | timestamptz default now() | |

### `physical_field`

Field definition on a modality. Scope distinguishes top-level (activity/plan-level) from subrow (per-exercise / per-split) fields.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| modality_id | uuid fk → modality on delete cascade | |
| scope | enum(`top`, `subrow`) | |
| key | text not null | machine key, immutable after creation; unique per (modality_id, scope) |
| label | text not null | UI label, editable |
| kind | enum(`text`, `number`, `decimal`, `duration_sec`, `distance_km`, `sets_array`, `category_ref`, `exercise_ref`) | |
| required | bool default false | enforced at write-time for new payloads only |
| sort_order | int default 0 | |
| config | jsonb null | per-kind options (e.g. number min/max, decimal precision) |

Constraints:

- `sets_array` only valid where `scope = 'subrow'`.
- `category_ref` and `exercise_ref` resolve against the same modality's categories/exercises.
- Unique index on `(modality_id, scope, key)`.

### `category`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| modality_id | uuid fk → modality cascade | |
| name | text not null | |
| sort_order | int default 0 | |

Unique `(modality_id, name)`.

### `exercise`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| modality_id | uuid fk cascade | |
| category_id | uuid fk → category on delete set null | optional |
| name | text not null | |
| archived_at | timestamptz null | |

Unique `(modality_id, name)`.

### `activity`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| modality_id | uuid fk → modality on delete restrict | |
| performed_at | timestamptz not null | |
| values | jsonb not null default `{}` | keyed by field.key (top scope) |
| comment | text null | first-class, not stored in `values` |

Indexes: `activity_modality_idx`, `activity_performed_at_idx`.

### `activity_subrow`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| activity_id | uuid fk cascade | |
| exercise_id | uuid fk → exercise on delete restrict, nullable | optional (e.g. running splits may omit) |
| values | jsonb not null default `{}` | keyed by field.key (subrow scope) |
| sort_order | int default 0 | |

Index: `activity_subrow_activity_idx`.

### `plan`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| modality_id | uuid fk restrict | |
| name | text not null | |
| notes | text null | free-form markdown |
| archived_at | timestamptz null | |

### `plan_subrow`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| plan_id | uuid fk cascade | |
| exercise_id | uuid fk restrict null | |
| values | jsonb default `{}` | planned target values (subrow scope) |
| sort_order | int default 0 | |

### Seed migration

Insert at first migration:

- Gym modality with categories `Push`, `Pull`, `Legs`, `Core`; top fields `notes` (optional text); subrow fields `exercise_ref` (required), `sets_array` (required).
- Running modality with categories `Easy`, `Tempo`, `Intervals`, `Long`; top fields `category_ref` (optional), `distance_km` (required), `duration_sec` (required), `pace_sec_per_km` as `duration_sec` (optional); subrow fields `distance_km`, `duration_sec`, `pace_sec_per_km` (all optional, for splits).
- A handful of sample exercises per modality.

## Field Kinds → Input + Zod

| kind | input | Zod fragment |
|---|---|---|
| text | `<input type=text>` | `z.string()` |
| number | int input | `z.number().int()` |
| decimal | number input step 0.01 | `z.number()` |
| duration_sec | mm:ss masked input | `z.number().int().min(0)` (stored as seconds) |
| distance_km | number input step 0.01 | `z.number().nonnegative()` |
| sets_array | repeating rows weight+reps | `z.array(z.object({ weight: z.number(), reps: z.number().int() }))` |
| category_ref | select of modality's categories | `z.string().uuid()` |
| exercise_ref | select of modality's exercises | `z.string().uuid()` |

Required fields wrap the fragment directly; non-required apply `.optional()` or `.nullable()` per kind.

`lib/validation/physical.ts` exports:

- `buildActivityValuesSchema(fields: PhysicalField[]): ZodObject` — given a modality's `top` fields, returns the Zod object keyed by field.key.
- `buildSubrowValuesSchema(fields: PhysicalField[]): ZodObject` — same for subrow.
- `activityPayloadSchema(modality)` — composes the above plus `performedAt`, `comment`, `subrows`.

## Server Actions + Reads

### Reads (Drizzle in RSC)

- `getModalities()` — non-archived, sorted.
- `getModalityWithFields(id)` — modality + fields (both scopes) + categories + exercises.
- `getActivities({ modalityId?, from?, to?, exerciseId?, categoryId? })` — paged list, joins modality for name and includes subrow count.
- `getActivity(id)` — activity + subrows + modality + field defs.
- `getPlans({ modalityId? })`, `getPlan(id)`.

### Mutations (server actions)

- Modalities: `createModality`, `renameModality`, `archiveModality`.
- Fields: `addField`, `updateField` (label/required/sort_order/config only — `key` and `kind` immutable), `removeField`, `reorderFields`. Removing a field used by activities prompts confirmation; existing jsonb is left intact but hidden.
- Categories: CRUD scoped to modality.
- Exercises: CRUD scoped to modality, optional category assignment.
- Activities: `createActivity(modalityId, payload)`, `updateActivity(id, payload)`, `deleteActivity(id)`. Payload: `{ performedAt, values, comment, subrows: [{ exerciseId?, values, sortOrder }] }`. Subrows are replaced wholesale in a transaction.
- Plans: same shape, no `performedAt`; plan also has `name` and `notes`.

All actions parse with Zod (schema built from modality fields), perform inserts/updates inside a single transaction, return `{ ok, data | error }`, and call `revalidatePath` on affected routes.

## Pure Logic

`lib/physical/`:

- `pace.ts` — `computePace(distanceKm, durationSec): SecondsPerKm`. Used for display hint next to the manual pace input; not auto-filled.
- `setSummary.ts` — `totalVolume`, `maxWeight`, `totalReps` from a `sets_array`.
- `formatDuration.ts` — `mmSsToSeconds` and `secondsToMmSs`.

## UI Flows

### Configuration

- `/configuration`: list of modalities with name, sort order, archive state. "Add modality" dialog (name only). Clicking a row opens `[modalityId]`.
- `/configuration/[modalityId]`: four sections — Top-level fields, Subrow fields, Categories, Exercises. Each supports add / edit / remove / reorder. Field editor exposes label, kind (only on add), required, kind-specific config. Exercise editor assigns category. Archive button at top.

### Activities

- `/activities`: filters in URL params (modality, date range, exercise, category). Toggle for flat list vs grouped (by date or modality). Each row shows date, modality, top-line summary, comment preview. "Log activity" button → `/activities/new`.
- `/activities/new`: pick modality first (single-select), then `DynamicActivityForm` renders that modality's schema.
- `/activities/[id]`: shows resolved field labels + values, subrows table, comment, edit and delete buttons.

### Plans

- `/plans`: filter by modality, list cards with name + notes preview, archive state.
- `/plans/[id]`: name, notes (markdown rendered read-mode, textarea in edit), planned subrows table (exercise + planned values).

### Empty states

Each list page shows a hint and a CTA when empty. The seed migration ensures Configuration is non-empty on first run; Activities and Plans start empty.

## Dynamic Activity Form

`DynamicActivityForm.tsx`:

- Props: modality with its fields (both scopes), modality's categories and exercises, optional existing activity to edit.
- Renders top-level fields, then a "Subrows" section with add/remove and up/down reorder buttons, then a comment textarea.
- Form state with `react-hook-form` if already adopted in the Task Manager module; otherwise plain `useState` + Zod parse on submit, matching the existing convention.
- Submit calls the relevant server action; surfaces field-level errors inline and toast for action-level errors.

## Testing

Vitest, pure logic only (matches Task Manager convention):

- `lib/physical/pace.test.ts` — zero distance, fractional km, rounding.
- `lib/physical/formatDuration.test.ts` — mm:ss ↔ seconds roundtrip, padding, invalid input.
- `lib/physical/setSummary.test.ts` — empty set arrays, mixed weights and reps.
- `lib/validation/physical.test.ts` — `buildActivityValuesSchema` for each field kind, required vs optional behaviour, rejection of malformed payloads.

No e2e or component tests in v1.

## Risks + Mitigations

- **Field key drift:** `physical_field.key` is immutable after creation. Only `label` and `config` are editable. Prevents jsonb keys from going stale.
- **Removing a used field:** removal does not strip historical jsonb. Removed fields stop rendering in UI; data is preserved should the field be re-added with the same key.
- **Required-field change:** required is enforced at write-time only. Old rows are not retroactively invalidated; edit may surface missing required fields that the user fills in to save.
- **`exercise_ref` / `category_ref` deletion:** FK on `set null` for category, `restrict` for exercise on subrows. Deleting an exercise still in use is blocked; archive instead.

## Open Questions

None at design time. Implementation plan to follow.
