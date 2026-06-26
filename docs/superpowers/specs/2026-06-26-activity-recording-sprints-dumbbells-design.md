# Activity recording: sprints + dumbbell/per-side reps

Date: 2026-06-26

## Problem

Two gaps in physical activity logging:

1. **Sprints** are recorded awkwardly. They currently get forced into the `split`
   subrow kind (distance-km / duration / pace), which doesn't match how sprints
   are actually done: N reps of a short distance (e.g. 6 × 100m).
2. **Dumbbell / unilateral work** can't be expressed well. A set like "2 dumbbells
   of 10kg for 10 reps" and single-arm/leg exercises (reps counted per side) have
   no clean representation.

## Background

Relevant existing model:

- `SetEntry = { weight, reps, bodyweight?, warmup? }` stored in a `sets_array`
  field inside subrow `values` (jsonb). Edited via `SetArrayInput`.
- Subrows have a `kind`: `"exercise"` (uses `sets`) or `"split"` (uses
  `distance` / `duration` / `pace`). The form whitelists keys per kind
  (`EXERCISE_KEYS`, `SPLIT_KEYS`) in `DynamicActivityForm.tsx`.
- `physical_activity_subrows.kind` has a DB CHECK constraint `IN ('exercise','split')`.
- Subrow/set internals are only rendered in the form; list/detail pages show counts.
- `setSummary()` aggregates volume/reps but is not currently shown in any UI.
- Migrations are plain numbered SQL applied by `scripts/db-apply.mjs`.

## Decisions (from brainstorming)

- Sprint set captures **distance per rep (meters)** + **number of reps**. No
  per-rep time, no rest. (YAGNI.)
- Dumbbell weight stored **per-hand** as the existing `weight` value — no count,
  no separate total. A 2×10kg set has `weight = 10`.
- Unilateral sets use a **per-side toggle**; reps are always equal on both sides,
  so a single reps value suffices (effective reps = reps × 2).

## Part A — Sprints: new `sprint` subrow kind

New subrow kind dedicated to sprints, parallel to `exercise` and `split`.

- `SubrowKind` type gains `"sprint"` (`db/schema/physical.ts`).
- Two new subrow `physical_fields`:
  - `sprintDistance` — label "Distance (m)", kind `number` (whole meters)
  - `sprintReps` — label "Reps", kind `number`
- `DynamicActivityForm.tsx`:
  - Add `SPRINT_KEYS = ["sprintDistance", "sprintReps"]`.
  - `fieldsForKind` returns sprint fields for the sprint kind.
  - Add "Sprint" to the kind `<Select>` options and a third add button.
- Validation: subrow `kind` enum in `activityPayloadSchema` gains `"sprint"`.
- Migration `0023_subrow_sprint.sql`:
  - Drop and re-add the `physical_activity_subrows_kind_check` constraint to allow
    `'sprint'`.
  - Insert the two `physical_fields` rows (scope `subrow`).

Reads as e.g. "6 × 100m". Sprint subrows store `exerciseId = null` (same as split).

## Part B — Dumbbells + per-side reps: extend `SetEntry`

- `SetEntry` type gains optional `perSide?: boolean` (`db/schema/physical.ts`).
- `setEntrySchema` gains `perSide: z.boolean().optional()` (`lib/validation/physical.ts`).
- `SetArrayInput.tsx`: add an "S" checkbox column (per side), styled like the
  existing BW / W toggles, with tooltip "Per side — done each arm/leg". New sets
  default `perSide` unset.
- `setSummary()`: when `perSide` is true, effective reps = `reps × 2`, applied to
  `totalVolume` (`weight × effReps`) and `totalReps`. `maxWeight` unchanged.
- No migration — `SetEntry` lives in jsonb; older sets without `perSide` read as
  falsy.

Weight entry is unchanged: the user types the per-hand weight directly.

## Out of scope

- Per-rep sprint times, rest intervals.
- Dumbbell count / auto total-weight math.
- Asymmetric left/right reps (reps assumed equal both sides).
- New list/detail rendering of sprint or per-side sets beyond the form.

## Testing

- `setSummary.test.ts`: add cases for `perSide` doubling volume and reps.
- `physical.test.ts` (validation): `setEntrySchema` accepts `perSide`; subrow
  schema accepts `kind: "sprint"`.
