# Activity Recording: Sprints + Dumbbell/Per-Side Reps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `sprint` subrow kind (distance-in-meters × reps) and a per-side reps toggle on weight sets (per-hand weight, doubles volume/reps for unilateral work).

**Architecture:** Sprints become a third subrow `kind` alongside `exercise`/`split`, driven by two new config-seeded `physical_fields` and key whitelists in the form. Per-side reps extend the jsonb `SetEntry` shape with an optional `perSide` boolean — no schema migration — surfaced as a checkbox column in `SetArrayInput` and accounted for in `setSummary`.

**Tech Stack:** Next.js (App Router, RSC + server actions), Drizzle ORM, PostgreSQL, Zod, React, Vitest, Tailwind/shadcn UI.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code — this Next.js has breaking changes vs. training data (per AGENTS.md).
- Migrations are plain numbered SQL in `db/migrations/`, applied by `npm run db:apply` (custom runner, tracks `_applied_migrations`). NOT drizzle-kit migrate.
- Dumbbell weight is stored **per-hand** — no count, no total math.
- Per-side sets always have equal reps both sides → effective reps = `reps × 2`.
- Sprint distance is **whole meters** (`number` kind). Sprint subrows store `exerciseId = null`.
- Tests run with `npm run test` (vitest run). Typecheck with `npm run typecheck`.

---

### Task 1: Extend `SetEntry` with `perSide` (type + validation)

**Files:**
- Modify: `db/schema/physical.ts:43` (the `SetEntry` type)
- Modify: `lib/validation/physical.ts:4-9` (`setEntrySchema`)
- Test: `lib/validation/physical.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SetEntry = { weight: number; reps: number; bodyweight?: boolean; warmup?: boolean; perSide?: boolean }`; `setEntrySchema` accepts optional `perSide: boolean`.

- [ ] **Step 1: Write the failing test**

Add to `lib/validation/physical.test.ts` (new `describe` block at end of file):

```ts
import { setEntrySchema } from "./physical";

describe("setEntrySchema perSide", () => {
  it("accepts perSide true", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10, perSide: true }).success).toBe(true);
  });
  it("accepts omitted perSide", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10 }).success).toBe(true);
  });
  it("rejects non-boolean perSide", () => {
    expect(setEntrySchema.safeParse({ weight: 10, reps: 10, perSide: "yes" }).success).toBe(false);
  });
});
```

Note: `setEntrySchema` is already exported from `lib/validation/physical.ts:4`. Merge the import with the existing import block at the top rather than adding a duplicate line.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/validation/physical.test.ts`
Expected: FAIL — `rejects non-boolean perSide` fails (schema currently strips unknown keys via `.optional()` absence, so `perSide:"yes"` is ignored and parse succeeds).

- [ ] **Step 3: Add `perSide` to the type**

In `db/schema/physical.ts` line 43, change:

```ts
export type SetEntry = { weight: number; reps: number; bodyweight?: boolean; warmup?: boolean };
```

to:

```ts
export type SetEntry = { weight: number; reps: number; bodyweight?: boolean; warmup?: boolean; perSide?: boolean };
```

- [ ] **Step 4: Add `perSide` to the schema**

In `lib/validation/physical.ts`, update `setEntrySchema` (lines 4-9):

```ts
export const setEntrySchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  bodyweight: z.boolean().optional(),
  warmup: z.boolean().optional(),
  perSide: z.boolean().optional(),
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- lib/validation/physical.test.ts`
Expected: PASS (all 3 new cases green).

- [ ] **Step 6: Commit**

```bash
git add db/schema/physical.ts lib/validation/physical.ts lib/validation/physical.test.ts
git commit -m "feat(physical): add perSide flag to SetEntry"
```

---

### Task 2: Count per-side reps in `setSummary`

**Files:**
- Modify: `lib/physical/setSummary.ts:10-20`
- Test: `lib/physical/setSummary.test.ts`

**Interfaces:**
- Consumes: `SetEntry.perSide` from Task 1.
- Produces: `setSummary` where a `perSide` set contributes `reps × 2` to `totalVolume` and `totalReps`; `maxWeight` and `setCount` unaffected.

- [ ] **Step 1: Write the failing test**

Add to `lib/physical/setSummary.test.ts` inside the existing `describe`:

```ts
  it("perSide doubles volume and reps", () => {
    const sets: SetEntry[] = [{ weight: 10, reps: 10, perSide: true }];
    expect(setSummary(sets)).toEqual({ totalVolume: 200, maxWeight: 10, totalReps: 20, setCount: 1 });
  });
  it("mixes perSide and normal", () => {
    const sets: SetEntry[] = [
      { weight: 10, reps: 10, perSide: true },
      { weight: 20, reps: 5 },
    ];
    expect(setSummary(sets)).toEqual({ totalVolume: 200 + 100, maxWeight: 20, totalReps: 20 + 5, setCount: 2 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/physical/setSummary.test.ts`
Expected: FAIL — `perSide doubles volume and reps` gets `totalVolume: 100, totalReps: 10`.

- [ ] **Step 3: Implement effective-reps doubling**

Replace the loop body in `lib/physical/setSummary.ts` (lines 14-18):

```ts
  for (const s of sets) {
    const effReps = s.perSide === true ? s.reps * 2 : s.reps;
    totalVolume += s.weight * effReps;
    if (s.weight > maxWeight) maxWeight = s.weight;
    totalReps += effReps;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/physical/setSummary.test.ts`
Expected: PASS (all cases, including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add lib/physical/setSummary.ts lib/physical/setSummary.test.ts
git commit -m "feat(physical): double volume/reps for per-side sets in setSummary"
```

---

### Task 3: Add per-side "S" checkbox column to `SetArrayInput`

**Files:**
- Modify: `app/(physical)/_components/SetArrayInput.tsx`

**Interfaces:**
- Consumes: `SetEntry.perSide` from Task 1.
- Produces: UI checkbox column "S" toggling `perSide` per set; new sets keep `perSide` unset.

No automated test — this is a presentational client component with no existing component-test harness in the repo. Verify by typecheck + manual smoke.

- [ ] **Step 1: Add the "S" header cell**

In `SetArrayInput.tsx`, the header grid currently is (lines 36-42):

```tsx
        <div className="grid grid-cols-[auto_auto_auto_1fr_1fr_auto] items-end gap-2">
          <Label className="text-xs">#</Label>
          <Label className="text-xs">BW</Label>
          <Label className="text-xs" title="Warm-up set">W</Label>
          <Label className="text-xs">Weight</Label>
          <Label className="text-xs">Reps</Label>
          <span />
```

Add one `auto` column for the new toggle and an "S" header after "W":

```tsx
        <div className="grid grid-cols-[auto_auto_auto_auto_1fr_1fr_auto] items-end gap-2">
          <Label className="text-xs">#</Label>
          <Label className="text-xs">BW</Label>
          <Label className="text-xs" title="Warm-up set">W</Label>
          <Label className="text-xs" title="Per side — done each arm/leg">S</Label>
          <Label className="text-xs">Weight</Label>
          <Label className="text-xs">Reps</Label>
          <span />
```

- [ ] **Step 2: Add the per-side checkbox cell in each row**

Inside the `value.map`, after the warm-up checkbox cell (the block ending at line 60, just before the Weight `<Input>` at line 61), add:

```tsx
                <div className="flex h-9 items-center justify-center">
                  <Checkbox
                    checked={s.perSide === true}
                    onCheckedChange={(c) => update(i, { perSide: c === true })}
                  />
                </div>
```

`update` already accepts `Partial<SetEntry>`, so `{ perSide: ... }` needs no other change. `add()` stays `{ weight: 0, reps: 0 }` (perSide unset by default).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add "app/(physical)/_components/SetArrayInput.tsx"
git commit -m "feat(physical): add per-side toggle column to set input"
```

---

### Task 4: Migration — allow `sprint` kind + seed sprint fields

**Files:**
- Create: `db/migrations/0023_subrow_sprint.sql`

**Interfaces:**
- Consumes: nothing (DB layer).
- Produces: `physical_activity_subrows.kind` CHECK allows `'sprint'`; two `physical_fields` rows exist — scope `subrow`, keys `sprintDistance` (kind `number`, label "Distance (m)", sort 3) and `sprintReps` (kind `number`, label "Reps", sort 4).

- [ ] **Step 1: Write the migration SQL**

Create `db/migrations/0023_subrow_sprint.sql`:

```sql
-- Allow a third subrow kind 'sprint' and seed its two subrow fields.
ALTER TABLE "physical_activity_subrows"
  DROP CONSTRAINT IF EXISTS "physical_activity_subrows_kind_check";
--> statement-breakpoint
ALTER TABLE "physical_activity_subrows"
  ADD CONSTRAINT "physical_activity_subrows_kind_check"
  CHECK ("kind" IN ('exercise', 'split', 'sprint'));
--> statement-breakpoint
INSERT INTO "physical_fields" (scope, key, label, kind, required, sort_order)
VALUES
  ('subrow', 'sprintDistance', 'Distance (m)', 'number', false, 3),
  ('subrow', 'sprintReps', 'Reps', 'number', false, 4)
ON CONFLICT (scope, key) DO NOTHING;
```

Note: `physical_fields` has `uniqueIndex` on `(scope, key)` (`physical_field_scope_key_idx`), so `ON CONFLICT (scope, key)` is valid and keeps the migration idempotent. `id`, `config`, `created_at`, `updated_at` use column defaults.

- [ ] **Step 2: Apply the migration**

Run: `npm run db:apply`
Expected: output includes `apply  0023_subrow_sprint.sql` then `done. 1 migration(s) applied`.

- [ ] **Step 3: Verify fields + constraint exist**

Run:
```bash
psql "${DATABASE_URL:-postgres://postgres:postgres@localhost:5433/lifeos}" -c "SELECT scope, key, kind, sort_order FROM physical_fields WHERE key IN ('sprintDistance','sprintReps') ORDER BY sort_order;"
```
Expected: two rows — `subrow | sprintDistance | number | 3` and `subrow | sprintReps | number | 4`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/0023_subrow_sprint.sql
git commit -m "feat(physical): migration for sprint subrow kind and fields"
```

---

### Task 5: Accept `sprint` kind in subrow validation

**Files:**
- Modify: `lib/validation/physical.ts:69`
- Test: `lib/validation/physical.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `activityPayloadSchema(...)` accepts subrows with `kind: "sprint"`.

- [ ] **Step 1: Write the failing test**

Add to `lib/validation/physical.test.ts` (new `describe` at end):

```ts
describe("activityPayloadSchema sprint kind", () => {
  it("accepts a sprint subrow", () => {
    const schema = activityPayloadSchema(
      [],
      [
        baseField({ scope: "subrow", key: "sprintDistance", kind: "number" }),
        baseField({ scope: "subrow", key: "sprintReps", kind: "number" }),
      ],
    );
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      tagIds: [],
      subrows: [
        { kind: "sprint", exerciseId: null, values: { sprintDistance: 100, sprintReps: 6 }, sortOrder: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/validation/physical.test.ts`
Expected: FAIL — `kind` enum is `["exercise","split"]`, so `"sprint"` is rejected.

- [ ] **Step 3: Add `sprint` to the enum**

In `lib/validation/physical.ts` line 69, change:

```ts
          kind: z.enum(["exercise", "split"]).default("exercise"),
```

to:

```ts
          kind: z.enum(["exercise", "split", "sprint"]).default("exercise"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/validation/physical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation/physical.ts lib/validation/physical.test.ts
git commit -m "feat(physical): accept sprint kind in activity validation"
```

---

### Task 6: Add `sprint` kind to the form

**Files:**
- Modify: `db/schema/physical.ts:137` (`SubrowKind` type)
- Modify: `app/(physical)/_components/DynamicActivityForm.tsx` (lines 56-62, 423-425, 472-479)

**Interfaces:**
- Consumes: `sprintDistance`/`sprintReps` fields from Task 4; `SubrowKind` now `"exercise" | "split" | "sprint"`; sprint enum from Task 5.
- Produces: form can add/edit/save sprint subrows.

No automated test (client component, no harness). Verify by typecheck + manual smoke at end.

- [ ] **Step 1: Extend the `SubrowKind` type**

In `db/schema/physical.ts` line 137, change:

```ts
export type SubrowKind = "exercise" | "split";
```

to:

```ts
export type SubrowKind = "exercise" | "split" | "sprint";
```

- [ ] **Step 2: Add `SPRINT_KEYS` and route them in `fieldsForKind`**

In `DynamicActivityForm.tsx`, update the key constants (lines 56-57):

```ts
const SPLIT_KEYS = ["distance", "duration", "pace"] as const;
const EXERCISE_KEYS = ["sets"] as const;
const SPRINT_KEYS = ["sprintDistance", "sprintReps"] as const;
```

Then update `fieldsForKind` (lines 59-62) to pick keys per kind:

```ts
function fieldsForKind(fields: PhysicalField[], kind: SubrowKind): PhysicalField[] {
  const keys =
    kind === "split" ? SPLIT_KEYS : kind === "sprint" ? SPRINT_KEYS : EXERCISE_KEYS;
  return fields.filter((f) => (keys as readonly string[]).includes(f.key));
}
```

- [ ] **Step 3: Add "Sprint" to the kind select**

In the per-row kind `<Select>` (lines 422-425), add the option after "split":

```tsx
                      <SelectContent>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="split">Split</SelectItem>
                        <SelectItem value="sprint">Sprint</SelectItem>
                      </SelectContent>
```

- [ ] **Step 4: Add the "Sprint" add button**

In the add-button row (lines 472-479), after the Split button add:

```tsx
            <Button size="sm" variant="outline" onClick={() => addSubrow("split")}>
              <Plus className="mr-2 h-4 w-4" /> Split
            </Button>
            <Button size="sm" variant="outline" onClick={() => addSubrow("sprint")}>
              <Plus className="mr-2 h-4 w-4" /> Sprint
            </Button>
```

Note: `setSubrowKind` (line 285) sets `exerciseId` to null for any non-`exercise` kind, so switching to/from sprint already clears the exercise — no change needed there. The save path in `_actions/activities.ts` writes `exerciseId` only when `kind === "exercise"`, so sprint rows persist `exerciseId = null` correctly.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/schema/physical.ts "app/(physical)/_components/DynamicActivityForm.tsx"
git commit -m "feat(physical): add sprint subrow kind to activity form"
```

---

### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — all suites green, including new perSide/sprint cases.

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in touched files.

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev`, open the new-activity page (`/activities/new`).
Verify:
- Set rows show a new "S" column; toggling it persists on save and reload.
- "Sprint" appears in the subrow kind dropdown and as an add button; a sprint row shows Distance (m) + Reps inputs; saving then reopening the activity preserves the sprint row values.

- [ ] **Step 5: Final commit (if any doc/cleanup changes)**

```bash
git add -A
git commit -m "chore(physical): verification pass for sprints + per-side reps" || echo "nothing to commit"
```
