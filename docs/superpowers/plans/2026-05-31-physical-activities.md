# Physical Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Physical Activities module per `docs/superpowers/specs/2026-05-31-physical-activities-design.md`: Configuration, Activities, Plans, schema-driven via modality field definitions.

**Architecture:** Route group `app/(physical)/` mirroring the Task Manager module. Drizzle schema in `db/schema/physical.ts`. Dynamic Zod validators built from `physical_field` rows. Server actions per resource. Activities and plans store top values + repeating subrows as jsonb keyed by field key. UI uses shadcn primitives. Pure logic (pace, duration, set summary) unit-tested with Vitest.

**Tech Stack:** Next.js 15 App Router · TypeScript · Drizzle ORM · PostgreSQL 16 · Zod · shadcn/ui · sonner toasts · Vitest · date-fns.

**Conventions to follow** (all confirmed in current code):

- Server actions: `"use server"`; return `{ ok: true, data } | { ok: false, error: string }`; helper `fail()`. Call a `_revalidate.ts` helper after mutations.
- DB schema: `pgTable`, `pgEnum`, UUID PKs `defaultRandom()`, timestamps `withTimezone: true` defaulting `sql\`now()\``.
- Validation: Zod schemas in `lib/validation/<module>.ts`, identical schema parsed in client form and server action.
- shadcn imports from `@/components/ui/*`. Available primitives: `button`, `card`, `dialog`, `input`, `label`, `select`, `textarea`, `checkbox`, `dropdown-menu`, `popover`, `badge`, `separator`. If a needed primitive is missing, add it via `pnpm dlx shadcn@latest add <name>`.
- Test runner: `pnpm test` (one-shot) / `pnpm test:watch`.
- Drizzle migrations: `pnpm db:generate` then `pnpm db:migrate`. Existing migrations live in `db/migrations/`.
- Sidebar: `components/nav-tree.tsx` lists groups and leaves; add a `physical` group similar to `tasks`.

---

## File Structure

**New schema**
- `db/schema/physical.ts` — modality, physical_field, category, exercise, activity, activity_subrow, plan, plan_subrow.
- `db/migrations/<n>_physical.sql` — generated.
- `db/migrations/<n+1>_physical_seed.sql` — hand-written seed (gym + running with categories, fields, sample exercises).

**Validation + pure logic**
- `lib/validation/physical.ts` — field-kind Zod fragments, `buildActivityValuesSchema`, `buildSubrowValuesSchema`, payload schemas.
- `lib/validation/physical.test.ts`
- `lib/physical/formatDuration.ts` — `mmSsToSeconds`, `secondsToMmSs`.
- `lib/physical/formatDuration.test.ts`
- `lib/physical/pace.ts` — `computePace(distanceKm, durationSec)`.
- `lib/physical/pace.test.ts`
- `lib/physical/setSummary.ts` — `totalVolume`, `maxWeight`, `totalReps`.
- `lib/physical/setSummary.test.ts`

**Queries + actions**
- `lib/queries/physical.ts` — `getModalities`, `getModalityWithFields`, `getActivities`, `getActivity`, `getPlans`, `getPlan`.
- `app/(physical)/_actions/_revalidate.ts`
- `app/(physical)/_actions/modalities.ts`
- `app/(physical)/_actions/fields.ts`
- `app/(physical)/_actions/categories.ts`
- `app/(physical)/_actions/exercises.ts`
- `app/(physical)/_actions/activities.ts`
- `app/(physical)/_actions/plans.ts`

**Pages**
- `app/(physical)/configuration/page.tsx`
- `app/(physical)/configuration/[modalityId]/page.tsx`
- `app/(physical)/activities/page.tsx`
- `app/(physical)/activities/new/page.tsx`
- `app/(physical)/activities/[id]/page.tsx`
- `app/(physical)/plans/page.tsx`
- `app/(physical)/plans/[id]/page.tsx`
- `app/(physical)/plans/new/page.tsx`

Delete `app/physical/page.tsx` (placeholder) after the route group is live, or first move it under the group and replace contents.

**Components** (`app/(physical)/_components/`)
- `ModalityForm.tsx` — create / rename dialog.
- `FieldEditor.tsx` — add / edit / remove / reorder fields list.
- `CategoryEditor.tsx`
- `ExerciseEditor.tsx`
- `DynamicActivityForm.tsx` — renders form from modality fields.
- `SubrowEditor.tsx` — repeating subrow list.
- `SetArrayInput.tsx`
- `ActivityList.tsx`
- `ActivityFilters.tsx`
- `PlanForm.tsx`
- `PlanList.tsx`

**Sidebar update**
- `components/nav-tree.tsx`: convert `Physical Activities` leaf to a group.

---

## Phase 0 — Sidebar + route group skeleton

### Task 1: Convert Physical leaf to group in sidebar

**Files:**
- Modify: `components/nav-tree.tsx`

- [ ] **Step 1: Update the sections list**

In `components/nav-tree.tsx`, replace the leaf entry `{ kind: "leaf", href: "/physical", label: "Physical Activities", icon: Activity }` with a group:

```tsx
const physicalChildren: LeafItem[] = [
  { href: "/configuration", label: "Configuration", icon: Settings2 },
  { href: "/activities", label: "Activities", icon: Dumbbell },
  { href: "/plans", label: "Plans", icon: ClipboardList },
];

const physicalPaths = new Set(["/configuration", "/activities", "/plans"]);

function isPhysicalRoute(pathname: string): boolean {
  if (physicalPaths.has(pathname)) return true;
  return (
    pathname.startsWith("/configuration/") ||
    pathname.startsWith("/activities/") ||
    pathname.startsWith("/plans/")
  );
}
```

Add the imports `Settings2`, `Dumbbell`, `ClipboardList` to the lucide-react import.

In the `useState` initializer, add `physical: isPhysicalRoute(pathname)`.

In the `sections` array, replace the old `physical` leaf with:

```tsx
{
  kind: "group",
  id: "physical",
  label: "Physical Activities",
  icon: Activity,
  children: physicalChildren,
},
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/nav-tree.tsx
git commit -m "feat(physical): expose physical activities as sidebar group"
```

### Task 2: Create route group with placeholder pages

**Files:**
- Create: `app/(physical)/configuration/page.tsx`
- Create: `app/(physical)/activities/page.tsx`
- Create: `app/(physical)/plans/page.tsx`
- Delete: `app/physical/page.tsx`
- Delete: `app/physical/` (empty)

- [ ] **Step 1: Add placeholder for configuration**

```tsx
// app/(physical)/configuration/page.tsx
import { Settings2 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function ConfigurationPage() {
  return (
    <PlaceholderPage
      icon={Settings2}
      title="Configuration"
      description="Configure modalities, fields, categories, and exercises."
    />
  );
}
```

- [ ] **Step 2: Add placeholder for activities**

```tsx
// app/(physical)/activities/page.tsx
import { Dumbbell } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function ActivitiesPage() {
  return (
    <PlaceholderPage
      icon={Dumbbell}
      title="Activities"
      description="Log and review workout sessions."
    />
  );
}
```

- [ ] **Step 3: Add placeholder for plans**

```tsx
// app/(physical)/plans/page.tsx
import { ClipboardList } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function PlansPage() {
  return (
    <PlaceholderPage
      icon={ClipboardList}
      title="Plans"
      description="Workout plan templates and notes."
    />
  );
}
```

- [ ] **Step 4: Remove the old placeholder route**

```bash
rm app/physical/page.tsx
rmdir app/physical
```

- [ ] **Step 5: Verify**

Run: `pnpm dev` (background). Open `/configuration`, `/activities`, `/plans` — all three render the placeholder. Sidebar group expands when on any of those routes.

- [ ] **Step 6: Commit**

```bash
git add app/\(physical\)/ app/physical
git commit -m "feat(physical): scaffold route group with placeholder pages"
```

---

## Phase 1 — Database schema

### Task 3: Create physical schema

**Files:**
- Create: `db/schema/physical.ts`
- Modify: `db/index.ts`

- [ ] **Step 1: Write the schema file**

```ts
// db/schema/physical.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const fieldScopeEnum = pgEnum("physical_field_scope", ["top", "subrow"]);
export type FieldScope = (typeof fieldScopeEnum.enumValues)[number];

export const fieldKindEnum = pgEnum("physical_field_kind", [
  "text",
  "number",
  "decimal",
  "duration_sec",
  "distance_km",
  "sets_array",
  "category_ref",
  "exercise_ref",
]);
export type FieldKind = (typeof fieldKindEnum.enumValues)[number];

export const fieldKindLabel: Record<FieldKind, string> = {
  text: "Text",
  number: "Whole number",
  decimal: "Decimal",
  duration_sec: "Duration (mm:ss)",
  distance_km: "Distance (km)",
  sets_array: "Sets (weight × reps)",
  category_ref: "Category reference",
  exercise_ref: "Exercise reference",
};

export type SetEntry = { weight: number; reps: number };

export type FieldConfig = {
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
} | null;

export const modality = pgTable(
  "modalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("modality_sort_idx").on(t.sortOrder)],
);

export const physicalField = pgTable(
  "physical_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
    scope: fieldScopeEnum("scope").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    kind: fieldKindEnum("kind").notNull(),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<FieldConfig>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("physical_field_unique_idx").on(t.modalityId, t.scope, t.key),
    index("physical_field_modality_idx").on(t.modalityId),
  ],
);

export const category = pgTable(
  "physical_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("category_modality_name_idx").on(t.modalityId, t.name),
    index("category_modality_idx").on(t.modalityId),
  ],
);

export const exercise = pgTable(
  "physical_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("exercise_modality_name_idx").on(t.modalityId, t.name),
    index("exercise_modality_idx").on(t.modalityId),
    index("exercise_category_idx").on(t.categoryId),
  ],
);

export const activity = pgTable(
  "physical_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "restrict" }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("activity_modality_idx").on(t.modalityId),
    index("activity_performed_at_idx").on(t.performedAt),
  ],
);

export const activitySubrow = pgTable(
  "physical_activity_subrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references((): AnyPgColumn => exercise.id, {
      onDelete: "restrict",
    }),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("activity_subrow_activity_idx").on(t.activityId)],
);

export const plan = pgTable(
  "physical_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modality.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("plan_modality_idx").on(t.modalityId)],
);

export const planSubrow = pgTable(
  "physical_plan_subrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references((): AnyPgColumn => exercise.id, {
      onDelete: "restrict",
    }),
    values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("plan_subrow_plan_idx").on(t.planId)],
);

export type Modality = typeof modality.$inferSelect;
export type PhysicalField = typeof physicalField.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type ActivitySubrow = typeof activitySubrow.$inferSelect;
export type Plan = typeof plan.$inferSelect;
export type PlanSubrow = typeof planSubrow.$inferSelect;
```

- [ ] **Step 2: Register schema in db client**

```ts
// db/index.ts
import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as tasksSchema from "./schema/tasks";
import * as physicalSchema from "./schema/physical";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema: { ...tasksSchema, ...physicalSchema } });
```

- [ ] **Step 3: Generate migration**

Run: `pnpm db:generate`
Expected: a new SQL file in `db/migrations/` is produced (likely `0002_*.sql`). Inspect it to confirm it creates the new enums and tables.

- [ ] **Step 4: Apply migration**

Ensure `pnpm db:up` is running (Docker postgres). Then:
Run: `pnpm db:migrate`
Expected: no error; tables present.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/schema/physical.ts db/index.ts db/migrations/
git commit -m "feat(physical): add modality, fields, categories, exercises, activities, plans schema"
```

### Task 4: Seed gym + running modalities

**Files:**
- Create: `db/migrations/<n>_physical_seed.sql` (manually authored migration, NOT generated)

- [ ] **Step 1: Author a hand-written migration**

After Task 3 generates `0002_*.sql`, create `0003_physical_seed.sql` with the same migration file format. Use `gen_random_uuid()` for IDs and CTEs to thread them through inserts:

```sql
-- 0003_physical_seed.sql
WITH gym AS (
  INSERT INTO modalities (id, name, sort_order)
  VALUES (gen_random_uuid(), 'Gym', 0)
  RETURNING id
),
running AS (
  INSERT INTO modalities (id, name, sort_order)
  VALUES (gen_random_uuid(), 'Running', 1)
  RETURNING id
),
gym_cats AS (
  INSERT INTO physical_categories (id, modality_id, name, sort_order)
  SELECT gen_random_uuid(), gym.id, n.name, n.idx
  FROM gym, (VALUES ('Push', 0), ('Pull', 1), ('Legs', 2), ('Core', 3)) AS n(name, idx)
  RETURNING id, name
),
running_cats AS (
  INSERT INTO physical_categories (id, modality_id, name, sort_order)
  SELECT gen_random_uuid(), running.id, n.name, n.idx
  FROM running, (VALUES ('Easy', 0), ('Tempo', 1), ('Intervals', 2), ('Long', 3)) AS n(name, idx)
  RETURNING id, name
),
gym_top_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), gym.id, 'top', 'notes', 'Notes', 'text', false, 0
  FROM gym
  RETURNING id
),
gym_sub_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), gym.id, 'subrow', f.key, f.label, f.kind::physical_field_kind, f.required, f.idx
  FROM gym, (VALUES
    ('exercise', 'Exercise', 'exercise_ref', true, 0),
    ('sets', 'Sets', 'sets_array', true, 1)
  ) AS f(key, label, kind, required, idx)
  RETURNING id
),
running_top_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), running.id, 'top', f.key, f.label, f.kind::physical_field_kind, f.required, f.idx
  FROM running, (VALUES
    ('category', 'Category', 'category_ref', false, 0),
    ('distance', 'Distance (km)', 'distance_km', true, 1),
    ('duration', 'Duration', 'duration_sec', true, 2),
    ('pace', 'Pace (per km)', 'duration_sec', false, 3)
  ) AS f(key, label, kind, required, idx)
  RETURNING id
),
running_sub_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), running.id, 'subrow', f.key, f.label, f.kind::physical_field_kind, false, f.idx
  FROM running, (VALUES
    ('distance', 'Distance (km)', 'distance_km', 0),
    ('duration', 'Duration', 'duration_sec', 1),
    ('pace', 'Pace (per km)', 'duration_sec', 2)
  ) AS f(key, label, kind, idx)
  RETURNING id
),
gym_exercises AS (
  INSERT INTO physical_exercises (id, modality_id, category_id, name)
  SELECT gen_random_uuid(), gym.id, c.id, e.name
  FROM gym
  JOIN gym_cats c ON c.name = e.category
  CROSS JOIN (VALUES
    ('Push', 'Bench Press'),
    ('Push', 'Overhead Press'),
    ('Pull', 'Deadlift'),
    ('Pull', 'Barbell Row'),
    ('Legs', 'Back Squat'),
    ('Legs', 'Romanian Deadlift'),
    ('Core', 'Plank')
  ) AS e(category, name)
  RETURNING id
)
INSERT INTO physical_exercises (id, modality_id, category_id, name)
SELECT gen_random_uuid(), running.id, c.id, e.name
FROM running
JOIN running_cats c ON c.name = e.category
CROSS JOIN (VALUES
  ('Easy', 'Easy Run'),
  ('Tempo', 'Tempo Run'),
  ('Intervals', 'Track Intervals'),
  ('Long', 'Long Run')
) AS e(category, name);
```

If `pgcrypto` extension (for `gen_random_uuid()`) is not enabled in the local Postgres, prepend `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.

- [ ] **Step 2: Add to drizzle journal**

drizzle-kit tracks applied migrations via `db/migrations/meta/_journal.json` and `*.snapshot.json`. Manually authored migrations need an entry. Easiest: place the seed in a generated empty migration. Run `pnpm db:generate --custom` if supported; otherwise use `pnpm drizzle-kit generate --custom --name physical_seed` to scaffold an empty SQL + journal entry, then paste the seed SQL into the created file.

- [ ] **Step 3: Apply seed**

Run: `pnpm db:migrate`
Expected: success. Verify with `pnpm db:studio` or `psql` that `modalities`, `physical_fields`, `physical_categories`, `physical_exercises` are populated.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/
git commit -m "feat(physical): seed gym and running modalities"
```

---

## Phase 2 — Pure logic + tests

### Task 5: Duration formatting

**Files:**
- Create: `lib/physical/formatDuration.ts`
- Test: `lib/physical/formatDuration.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/physical/formatDuration.test.ts
import { describe, expect, it } from "vitest";
import { mmSsToSeconds, secondsToMmSs } from "./formatDuration";

describe("secondsToMmSs", () => {
  it("zero", () => expect(secondsToMmSs(0)).toBe("0:00"));
  it("under a minute", () => expect(secondsToMmSs(7)).toBe("0:07"));
  it("exactly a minute", () => expect(secondsToMmSs(60)).toBe("1:00"));
  it("multi-digit minutes", () => expect(secondsToMmSs(605)).toBe("10:05"));
  it("hours fold into minutes", () => expect(secondsToMmSs(3725)).toBe("62:05"));
  it("negative input clamps to zero", () => expect(secondsToMmSs(-5)).toBe("0:00"));
});

describe("mmSsToSeconds", () => {
  it("plain integer string returns seconds", () => expect(mmSsToSeconds("45")).toBe(45));
  it("m:ss form", () => expect(mmSsToSeconds("5:07")).toBe(307));
  it("mm:ss form", () => expect(mmSsToSeconds("12:30")).toBe(750));
  it("rejects garbage", () => expect(mmSsToSeconds("abc")).toBeNull());
  it("rejects seconds >= 60", () => expect(mmSsToSeconds("1:75")).toBeNull());
  it("empty string is null", () => expect(mmSsToSeconds("")).toBeNull());
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `pnpm test lib/physical/formatDuration`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// lib/physical/formatDuration.ts
export function secondsToMmSs(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0:00";
  const t = Math.round(total);
  const minutes = Math.floor(t / 60);
  const seconds = t % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function mmSsToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (!match) return null;
  const m = Number(match[1]);
  const s = Number(match[2]);
  if (s >= 60) return null;
  return m * 60 + s;
}
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm test lib/physical/formatDuration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/physical/formatDuration.ts lib/physical/formatDuration.test.ts
git commit -m "feat(physical): add mm:ss duration helpers"
```

### Task 6: Pace computation

**Files:**
- Create: `lib/physical/pace.ts`
- Test: `lib/physical/pace.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// lib/physical/pace.test.ts
import { describe, expect, it } from "vitest";
import { computePace } from "./pace";

describe("computePace", () => {
  it("standard pace", () => expect(computePace(10, 3000)).toBe(300));
  it("fractional km", () => expect(computePace(5.5, 1650)).toBe(300));
  it("zero distance is null", () => expect(computePace(0, 1200)).toBeNull());
  it("negative distance is null", () => expect(computePace(-1, 600)).toBeNull());
  it("rounds to nearest second", () => expect(computePace(3, 1001)).toBe(334));
});
```

- [ ] **Step 2: Run, expect fail**

Run: `pnpm test lib/physical/pace`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/physical/pace.ts
export function computePace(distanceKm: number, durationSec: number): number | null {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationSec)) return null;
  if (distanceKm <= 0 || durationSec < 0) return null;
  return Math.round(durationSec / distanceKm);
}
```

- [ ] **Step 4: Pass**

Run: `pnpm test lib/physical/pace`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/physical/pace.ts lib/physical/pace.test.ts
git commit -m "feat(physical): add pace computation helper"
```

### Task 7: Set summary

**Files:**
- Create: `lib/physical/setSummary.ts`
- Test: `lib/physical/setSummary.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// lib/physical/setSummary.test.ts
import { describe, expect, it } from "vitest";
import { setSummary } from "./setSummary";
import type { SetEntry } from "@/db/schema/physical";

describe("setSummary", () => {
  it("empty list", () => {
    expect(setSummary([])).toEqual({ totalVolume: 0, maxWeight: 0, totalReps: 0, setCount: 0 });
  });
  it("single set", () => {
    const sets: SetEntry[] = [{ weight: 100, reps: 5 }];
    expect(setSummary(sets)).toEqual({ totalVolume: 500, maxWeight: 100, totalReps: 5, setCount: 1 });
  });
  it("mixed sets", () => {
    const sets: SetEntry[] = [
      { weight: 60, reps: 10 },
      { weight: 80, reps: 8 },
      { weight: 100, reps: 5 },
    ];
    expect(setSummary(sets)).toEqual({ totalVolume: 600 + 640 + 500, maxWeight: 100, totalReps: 23, setCount: 3 });
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `pnpm test lib/physical/setSummary`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/physical/setSummary.ts
import type { SetEntry } from "@/db/schema/physical";

export type SetSummary = {
  totalVolume: number;
  maxWeight: number;
  totalReps: number;
  setCount: number;
};

export function setSummary(sets: SetEntry[]): SetSummary {
  let totalVolume = 0;
  let maxWeight = 0;
  let totalReps = 0;
  for (const s of sets) {
    totalVolume += s.weight * s.reps;
    if (s.weight > maxWeight) maxWeight = s.weight;
    totalReps += s.reps;
  }
  return { totalVolume, maxWeight, totalReps, setCount: sets.length };
}
```

- [ ] **Step 4: Pass**

Run: `pnpm test lib/physical/setSummary`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/physical/setSummary.ts lib/physical/setSummary.test.ts
git commit -m "feat(physical): add set summary helper"
```

---

## Phase 3 — Validation builder

### Task 8: Dynamic Zod from field definitions

**Files:**
- Create: `lib/validation/physical.ts`
- Test: `lib/validation/physical.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// lib/validation/physical.test.ts
import { describe, expect, it } from "vitest";
import {
  buildActivityValuesSchema,
  buildSubrowValuesSchema,
  activityPayloadSchema,
} from "./physical";
import type { PhysicalField } from "@/db/schema/physical";

const baseField = (
  overrides: Partial<PhysicalField>,
): PhysicalField =>
  ({
    id: "00000000-0000-0000-0000-000000000000",
    modalityId: "00000000-0000-0000-0000-000000000001",
    scope: "top",
    key: "f",
    label: "F",
    kind: "text",
    required: false,
    sortOrder: 0,
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PhysicalField;

describe("buildActivityValuesSchema", () => {
  it("text optional", () => {
    const schema = buildActivityValuesSchema([baseField({ key: "notes", kind: "text" })]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ notes: "hello" }).success).toBe(true);
  });
  it("text required rejects empty object", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "notes", kind: "text", required: true }),
    ]);
    expect(schema.safeParse({}).success).toBe(false);
  });
  it("number kind rejects strings", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "reps", kind: "number", required: true }),
    ]);
    expect(schema.safeParse({ reps: "5" }).success).toBe(false);
    expect(schema.safeParse({ reps: 5 }).success).toBe(true);
  });
  it("distance_km accepts decimal", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "d", kind: "distance_km", required: true }),
    ]);
    expect(schema.safeParse({ d: 5.25 }).success).toBe(true);
    expect(schema.safeParse({ d: -1 }).success).toBe(false);
  });
  it("category_ref expects uuid", () => {
    const schema = buildActivityValuesSchema([
      baseField({ key: "c", kind: "category_ref", required: true }),
    ]);
    expect(schema.safeParse({ c: "not-a-uuid" }).success).toBe(false);
    expect(schema.safeParse({ c: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
  });
});

describe("buildSubrowValuesSchema", () => {
  it("sets_array rejects negative reps", () => {
    const schema = buildSubrowValuesSchema([
      baseField({ scope: "subrow", key: "sets", kind: "sets_array", required: true }),
    ]);
    expect(
      schema.safeParse({ sets: [{ weight: 80, reps: -1 }] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ sets: [{ weight: 80, reps: 8 }] }).success,
    ).toBe(true);
  });
});

describe("activityPayloadSchema", () => {
  const top = [baseField({ key: "notes", kind: "text" })];
  const sub = [baseField({ scope: "subrow", key: "sets", kind: "sets_array", required: true })];

  it("accepts minimal payload", () => {
    const schema = activityPayloadSchema(top, sub);
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      comment: null,
      subrows: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects subrow missing required field", () => {
    const schema = activityPayloadSchema(top, sub);
    const result = schema.safeParse({
      performedAt: new Date(),
      values: {},
      comment: null,
      subrows: [{ exerciseId: null, values: {}, sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `pnpm test lib/validation/physical`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/validation/physical.ts
import { z, ZodTypeAny } from "zod";
import type { PhysicalField } from "@/db/schema/physical";

export const setEntrySchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
});

function baseFragment(kind: PhysicalField["kind"]): ZodTypeAny {
  switch (kind) {
    case "text":
      return z.string().max(10_000);
    case "number":
      return z.number().int();
    case "decimal":
      return z.number();
    case "duration_sec":
      return z.number().int().min(0);
    case "distance_km":
      return z.number().nonnegative();
    case "sets_array":
      return z.array(setEntrySchema);
    case "category_ref":
    case "exercise_ref":
      return z.uuid();
  }
}

function fieldFragment(field: PhysicalField): ZodTypeAny {
  const base = baseFragment(field.kind);
  return field.required ? base : base.optional().nullable();
}

function buildValuesSchema(fields: PhysicalField[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) shape[f.key] = fieldFragment(f);
  return z.object(shape);
}

export function buildActivityValuesSchema(fields: PhysicalField[]) {
  return buildValuesSchema(fields.filter((f) => f.scope === "top"));
}

export function buildSubrowValuesSchema(fields: PhysicalField[]) {
  return buildValuesSchema(fields.filter((f) => f.scope === "subrow"));
}

export function activityPayloadSchema(
  topFields: PhysicalField[],
  subrowFields: PhysicalField[],
) {
  const valuesSchema = buildActivityValuesSchema(topFields);
  const subrowValuesSchema = buildSubrowValuesSchema(subrowFields);
  return z.object({
    performedAt: z.date(),
    values: valuesSchema,
    comment: z.string().max(10_000).optional().nullable(),
    subrows: z
      .array(
        z.object({
          exerciseId: z.uuid().optional().nullable(),
          values: subrowValuesSchema,
          sortOrder: z.number().int().nonnegative(),
        }),
      )
      .default([]),
  });
}

export function planPayloadSchema(subrowFields: PhysicalField[]) {
  const subrowValuesSchema = buildSubrowValuesSchema(subrowFields);
  return z.object({
    name: z.string().trim().min(1).max(200),
    notes: z.string().max(20_000).optional().nullable(),
    subrows: z
      .array(
        z.object({
          exerciseId: z.uuid().optional().nullable(),
          values: subrowValuesSchema,
          sortOrder: z.number().int().nonnegative(),
        }),
      )
      .default([]),
  });
}

export type ActivityPayload = z.infer<ReturnType<typeof activityPayloadSchema>>;
export type PlanPayload = z.infer<ReturnType<typeof planPayloadSchema>>;
```

- [ ] **Step 4: Pass**

Run: `pnpm test lib/validation/physical`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation/physical.ts lib/validation/physical.test.ts
git commit -m "feat(physical): add dynamic Zod schema builders for fields and payloads"
```

---

## Phase 4 — Queries + revalidate

### Task 9: Read helpers

**Files:**
- Create: `lib/queries/physical.ts`
- Create: `app/(physical)/_actions/_revalidate.ts`

- [ ] **Step 1: Revalidate helper**

```ts
// app/(physical)/_actions/_revalidate.ts
import { revalidatePath } from "next/cache";

export function revalidatePhysicalRoutes(opts?: {
  modalityId?: string;
  activityId?: string;
  planId?: string;
}) {
  revalidatePath("/configuration");
  revalidatePath("/activities");
  revalidatePath("/plans");
  if (opts?.modalityId) revalidatePath(`/configuration/${opts.modalityId}`);
  if (opts?.activityId) revalidatePath(`/activities/${opts.activityId}`);
  if (opts?.planId) revalidatePath(`/plans/${opts.planId}`);
}
```

- [ ] **Step 2: Query helpers**

```ts
// lib/queries/physical.ts
import "server-only";
import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  activity,
  activitySubrow,
  category,
  exercise,
  modality,
  physicalField,
  plan,
  planSubrow,
  type Activity,
  type ActivitySubrow,
  type Category,
  type Exercise,
  type Modality,
  type PhysicalField,
  type Plan,
  type PlanSubrow,
} from "@/db/schema/physical";

export type ModalityWithFields = {
  modality: Modality;
  fields: PhysicalField[];
  categories: Category[];
  exercises: Exercise[];
};

export async function getModalities(includeArchived = false): Promise<Modality[]> {
  const rows = await db
    .select()
    .from(modality)
    .where(includeArchived ? undefined : isNull(modality.archivedAt))
    .orderBy(asc(modality.sortOrder), asc(modality.name));
  return rows;
}

export async function getModalityWithFields(id: string): Promise<ModalityWithFields | null> {
  const [m] = await db.select().from(modality).where(eq(modality.id, id)).limit(1);
  if (!m) return null;
  const [fields, categories, exercises] = await Promise.all([
    db
      .select()
      .from(physicalField)
      .where(eq(physicalField.modalityId, id))
      .orderBy(asc(physicalField.scope), asc(physicalField.sortOrder)),
    db
      .select()
      .from(category)
      .where(eq(category.modalityId, id))
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select()
      .from(exercise)
      .where(and(eq(exercise.modalityId, id), isNull(exercise.archivedAt)))
      .orderBy(asc(exercise.name)),
  ]);
  return { modality: m, fields, categories, exercises };
}

export type ActivityListFilters = {
  modalityId?: string;
  from?: Date;
  to?: Date;
};

export type ActivityListRow = Activity & { modalityName: string; subrowCount: number };

export async function getActivities(filters: ActivityListFilters): Promise<ActivityListRow[]> {
  const conditions = [];
  if (filters.modalityId) conditions.push(eq(activity.modalityId, filters.modalityId));
  if (filters.from) conditions.push(gte(activity.performedAt, filters.from));
  if (filters.to) conditions.push(lte(activity.performedAt, filters.to));

  const rows = await db
    .select({
      a: activity,
      modalityName: modality.name,
    })
    .from(activity)
    .innerJoin(modality, eq(modality.id, activity.modalityId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activity.performedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.a.id);
  const counts = await db
    .select({ activityId: activitySubrow.activityId })
    .from(activitySubrow)
    .where(eq(activitySubrow.activityId, ids[0]));

  // simple per-row count (n is small, single user) — fetch all and tally
  const subrows = await db.select().from(activitySubrow);
  const counter = new Map<string, number>();
  for (const s of subrows) counter.set(s.activityId, (counter.get(s.activityId) ?? 0) + 1);

  return rows.map(({ a, modalityName }) => ({
    ...a,
    modalityName,
    subrowCount: counter.get(a.id) ?? 0,
  }));
}

export type ActivityDetail = {
  activity: Activity;
  modality: Modality;
  fields: PhysicalField[];
  subrows: ActivitySubrow[];
  exercises: Exercise[];
  categories: Category[];
};

export async function getActivity(id: string): Promise<ActivityDetail | null> {
  const [a] = await db.select().from(activity).where(eq(activity.id, id)).limit(1);
  if (!a) return null;
  const withFields = await getModalityWithFields(a.modalityId);
  if (!withFields) return null;
  const subrows = await db
    .select()
    .from(activitySubrow)
    .where(eq(activitySubrow.activityId, id))
    .orderBy(asc(activitySubrow.sortOrder));
  return {
    activity: a,
    modality: withFields.modality,
    fields: withFields.fields,
    subrows,
    exercises: withFields.exercises,
    categories: withFields.categories,
  };
}

export type PlanListRow = Plan & { modalityName: string };

export async function getPlans(filters: { modalityId?: string }): Promise<PlanListRow[]> {
  const conditions = [isNull(plan.archivedAt)];
  if (filters.modalityId) conditions.push(eq(plan.modalityId, filters.modalityId));
  const rows = await db
    .select({ p: plan, modalityName: modality.name })
    .from(plan)
    .innerJoin(modality, eq(modality.id, plan.modalityId))
    .where(and(...conditions))
    .orderBy(asc(plan.name));
  return rows.map(({ p, modalityName }) => ({ ...p, modalityName }));
}

export type PlanDetail = {
  plan: Plan;
  modality: Modality;
  fields: PhysicalField[];
  exercises: Exercise[];
  categories: Category[];
  subrows: PlanSubrow[];
};

export async function getPlan(id: string): Promise<PlanDetail | null> {
  const [p] = await db.select().from(plan).where(eq(plan.id, id)).limit(1);
  if (!p) return null;
  const withFields = await getModalityWithFields(p.modalityId);
  if (!withFields) return null;
  const subrows = await db
    .select()
    .from(planSubrow)
    .where(eq(planSubrow.planId, id))
    .orderBy(asc(planSubrow.sortOrder));
  return {
    plan: p,
    modality: withFields.modality,
    fields: withFields.fields,
    exercises: withFields.exercises,
    categories: withFields.categories,
    subrows,
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/physical.ts app/\(physical\)/_actions/_revalidate.ts
git commit -m "feat(physical): add Drizzle read helpers and revalidate helper"
```

---

## Phase 5 — Server actions (configuration)

### Task 10: Modality actions

**Files:**
- Create: `app/(physical)/_actions/modalities.ts`

- [ ] **Step 1: Implement**

```ts
// app/(physical)/_actions/modalities.ts
"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { modality } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const nameSchema = z.string().trim().min(1, "Name required").max(100);

export async function createModality(name: string): Promise<ActionResult<{ id: string }>> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name");
  try {
    const [row] = await db
      .insert(modality)
      .values({ name: parsed.data })
      .returning({ id: modality.id });
    revalidatePhysicalRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Modality name must be unique");
    throw e;
  }
}

export async function renameModality(id: string, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name");
  await db
    .update(modality)
    .set({ name: parsed.data, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}

export async function archiveModality(id: string): Promise<ActionResult> {
  await db
    .update(modality)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}

export async function unarchiveModality(id: string): Promise<ActionResult> {
  await db
    .update(modality)
    .set({ archivedAt: null, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(physical\)/_actions/modalities.ts
git commit -m "feat(physical): add modality CRUD server actions"
```

### Task 11: Field, category, exercise actions

**Files:**
- Create: `app/(physical)/_actions/fields.ts`
- Create: `app/(physical)/_actions/categories.ts`
- Create: `app/(physical)/_actions/exercises.ts`

- [ ] **Step 1: Fields**

```ts
// app/(physical)/_actions/fields.ts
"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { physicalField, fieldKindEnum, fieldScopeEnum } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, digits, underscores; must start with a letter");

const addSchema = z.object({
  modalityId: z.uuid(),
  scope: z.enum(fieldScopeEnum.enumValues),
  key: keySchema,
  label: z.string().trim().min(1).max(120),
  kind: z.enum(fieldKindEnum.enumValues),
  required: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function addField(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;
  if (data.kind === "sets_array" && data.scope !== "subrow") {
    return fail("sets_array only valid on subrow fields");
  }
  try {
    const [row] = await db
      .insert(physicalField)
      .values({
        modalityId: data.modalityId,
        scope: data.scope,
        key: data.key,
        label: data.label,
        kind: data.kind,
        required: data.required,
        sortOrder: data.sortOrder,
        config: (data.config ?? null) as never,
      })
      .returning({ id: physicalField.id });
    revalidatePhysicalRoutes({ modalityId: data.modalityId });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Field key must be unique within scope");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1).max(120).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function updateField(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db
    .update(physicalField)
    .set({ ...patch, updatedAt: sql`now()` } as never)
    .where(eq(physicalField.id, id));
  const [row] = await db
    .select({ modalityId: physicalField.modalityId })
    .from(physicalField)
    .where(eq(physicalField.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function removeField(id: string): Promise<ActionResult> {
  const [row] = await db
    .select({ modalityId: physicalField.modalityId })
    .from(physicalField)
    .where(eq(physicalField.id, id));
  await db.delete(physicalField).where(eq(physicalField.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function reorderFields(
  modalityId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(physicalField)
        .set({ sortOrder: i, updatedAt: sql`now()` })
        .where(and(eq(physicalField.id, orderedIds[i]), eq(physicalField.modalityId, modalityId)));
    }
  });
  revalidatePhysicalRoutes({ modalityId });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Categories**

```ts
// app/(physical)/_actions/categories.ts
"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  modalityId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addCategory(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(category)
      .values(parsed.data)
      .returning({ id: category.id });
    revalidatePhysicalRoutes({ modalityId: parsed.data.modalityId });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Category name must be unique");
    throw e;
  }
}

const renameSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
});

export async function renameCategory(input: z.input<typeof renameSchema>): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await db
    .update(category)
    .set({ name: parsed.data.name })
    .where(eq(category.id, parsed.data.id));
  const [row] = await db.select({ modalityId: category.modalityId }).from(category).where(eq(category.id, parsed.data.id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function removeCategory(id: string): Promise<ActionResult> {
  const [row] = await db.select({ modalityId: category.modalityId }).from(category).where(eq(category.id, id));
  await db.delete(category).where(eq(category.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function reorderCategories(modalityId: string, orderedIds: string[]): Promise<ActionResult> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(category)
        .set({ sortOrder: i })
        .where(and(eq(category.id, orderedIds[i]), eq(category.modalityId, modalityId)));
    }
  });
  revalidatePhysicalRoutes({ modalityId });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 3: Exercises**

```ts
// app/(physical)/_actions/exercises.ts
"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercise } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  modalityId: z.uuid(),
  categoryId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
});

export async function addExercise(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(exercise)
      .values({
        modalityId: parsed.data.modalityId,
        categoryId: parsed.data.categoryId ?? null,
        name: parsed.data.name,
      })
      .returning({ id: exercise.id });
    revalidatePhysicalRoutes({ modalityId: parsed.data.modalityId });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Exercise name must be unique");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function updateExercise(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db.update(exercise).set({ ...patch, updatedAt: sql`now()` }).where(eq(exercise.id, id));
  const [row] = await db.select({ modalityId: exercise.modalityId }).from(exercise).where(eq(exercise.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function archiveExercise(id: string): Promise<ActionResult> {
  const [row] = await db.select({ modalityId: exercise.modalityId }).from(exercise).where(eq(exercise.id, id));
  await db
    .update(exercise)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(exercise.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/\(physical\)/_actions/fields.ts app/\(physical\)/_actions/categories.ts app/\(physical\)/_actions/exercises.ts
git commit -m "feat(physical): add field, category, and exercise CRUD server actions"
```

---

## Phase 6 — Configuration UI

### Task 12: Configuration list page + modality form dialog

**Files:**
- Replace: `app/(physical)/configuration/page.tsx`
- Create: `app/(physical)/_components/ModalityForm.tsx`

- [ ] **Step 1: ModalityForm dialog**

```tsx
// app/(physical)/_components/ModalityForm.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createModality } from "../_actions/modalities";

export function ModalityForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createModality(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Modality created");
      setName("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New modality
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New modality</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="modality-name">Name</Label>
          <Input
            id="modality-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cycling"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Configuration list page**

```tsx
// app/(physical)/configuration/page.tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getModalities } from "@/lib/queries/physical";
import { Card } from "@/components/ui/card";
import { ModalityForm } from "../_components/ModalityForm";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const modalities = await getModalities(true);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Modalities, fields, categories, and exercises.
          </p>
        </div>
        <ModalityForm />
      </div>

      {modalities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No modalities yet. Create one to begin.</p>
      ) : (
        <ul className="space-y-2">
          {modalities.map((m) => (
            <li key={m.id}>
              <Link href={`/configuration/${m.id}`}>
                <Card className="flex items-center justify-between px-4 py-3 hover:bg-accent">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    {m.archivedAt ? (
                      <div className="text-xs text-muted-foreground">Archived</div>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Visit `/configuration`. Should list Gym and Running. "New modality" dialog creates a row.

- [ ] **Step 4: Commit**

```bash
git add app/\(physical\)/configuration/page.tsx app/\(physical\)/_components/ModalityForm.tsx
git commit -m "feat(physical): configuration list page with modality creation"
```

### Task 13: Modality detail page + editors

**Files:**
- Create: `app/(physical)/configuration/[modalityId]/page.tsx`
- Create: `app/(physical)/_components/FieldEditor.tsx`
- Create: `app/(physical)/_components/CategoryEditor.tsx`
- Create: `app/(physical)/_components/ExerciseEditor.tsx`

- [ ] **Step 1: FieldEditor**

```tsx
// app/(physical)/_components/FieldEditor.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addField,
  removeField,
  reorderFields,
  updateField,
} from "../_actions/fields";
import {
  fieldKindLabel,
  type FieldKind,
  type FieldScope,
  type PhysicalField,
} from "@/db/schema/physical";

const KIND_ORDER: FieldKind[] = [
  "text",
  "number",
  "decimal",
  "duration_sec",
  "distance_km",
  "sets_array",
  "category_ref",
  "exercise_ref",
];

export function FieldEditor({
  modalityId,
  scope,
  fields,
}: {
  modalityId: string;
  scope: FieldScope;
  fields: PhysicalField[];
}) {
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<FieldKind>("text");
  const [required, setRequired] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitAdd() {
    startTransition(async () => {
      const result = await addField({
        modalityId,
        scope,
        key,
        label,
        kind,
        required,
        sortOrder: fields.length,
      });
      if (!result.ok) return toast.error(result.error);
      toast.success("Field added");
      setKey("");
      setLabel("");
      setKind("text");
      setRequired(false);
      setAdding(false);
    });
  }

  function toggleRequired(field: PhysicalField, value: boolean) {
    startTransition(async () => {
      const result = await updateField({ id: field.id, required: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function relabel(field: PhysicalField, value: string) {
    startTransition(async () => {
      const result = await updateField({ id: field.id, label: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function move(idx: number, direction: -1 | 1) {
    const next = idx + direction;
    if (next < 0 || next >= fields.length) return;
    const reordered = fields.slice();
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    startTransition(async () => {
      const result = await reorderFields(
        modalityId,
        reordered.map((f) => f.id),
      );
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(field: PhysicalField) {
    if (!confirm(`Remove field "${field.label}"? Existing activity data is preserved.`)) return;
    startTransition(async () => {
      const result = await removeField(field.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {fields.map((f, idx) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <div className="flex flex-1 items-center gap-3">
              <Input
                value={f.label}
                onChange={(e) => relabel(f, e.target.value)}
                className="max-w-[14rem]"
              />
              <span className="text-xs text-muted-foreground">{f.key}</span>
              <span className="text-xs">{fieldKindLabel[f.kind]}</span>
              <label className="ml-2 flex items-center gap-2 text-xs">
                <Checkbox
                  checked={f.required}
                  onCheckedChange={(v) => toggleRequired(f, Boolean(v))}
                />
                required
              </label>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={pending}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={pending}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(f)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-md border p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. distance" />
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Distance" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as FieldKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_ORDER.filter((k) => scope === "subrow" || k !== "sets_array").map((k) => (
                    <SelectItem key={k} value={k}>{fieldKindLabel[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2">
              <Checkbox checked={required} onCheckedChange={(v) => setRequired(Boolean(v))} />
              <span>Required</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={pending}>Cancel</Button>
            <Button onClick={submitAdd} disabled={pending || !key.trim() || !label.trim()}>Add field</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add {scope === "top" ? "top-level" : "subrow"} field
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: CategoryEditor**

```tsx
// app/(physical)/_components/CategoryEditor.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCategory, removeCategory, renameCategory } from "../_actions/categories";
import type { Category } from "@/db/schema/physical";

export function CategoryEditor({
  modalityId,
  categories,
}: {
  modalityId: string;
  categories: Category[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addCategory({
        modalityId,
        name,
        sortOrder: categories.length,
      });
      if (!result.ok) return toast.error(result.error);
      setName("");
    });
  }

  function rename(cat: Category, value: string) {
    startTransition(async () => {
      const result = await renameCategory({ id: cat.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(cat: Category) {
    if (!confirm(`Remove "${cat.name}"? Exercises in this category lose their category.`)) return;
    startTransition(async () => {
      const result = await removeCategory(cat.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input value={c.name} onChange={(e) => rename(c, e.target.value)} className="max-w-xs" />
            <Button size="icon" variant="ghost" onClick={() => remove(c)} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="max-w-xs" />
        <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add category
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ExerciseEditor**

```tsx
// app/(physical)/_components/ExerciseEditor.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addExercise, archiveExercise, updateExercise } from "../_actions/exercises";
import type { Category, Exercise } from "@/db/schema/physical";

const NO_CATEGORY = "__none__";

export function ExerciseEditor({
  modalityId,
  categories,
  exercises,
}: {
  modalityId: string;
  categories: Category[];
  exercises: Exercise[];
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addExercise({
        modalityId,
        name,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      });
      if (!result.ok) return toast.error(result.error);
      setName("");
    });
  }

  function rename(ex: Exercise, value: string) {
    startTransition(async () => {
      const result = await updateExercise({ id: ex.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function setCategory(ex: Exercise, value: string) {
    startTransition(async () => {
      const result = await updateExercise({
        id: ex.id,
        categoryId: value === NO_CATEGORY ? null : value,
      });
      if (!result.ok) toast.error(result.error);
    });
  }

  function archive(ex: Exercise) {
    if (!confirm(`Archive "${ex.name}"? It hides from selectors but past entries keep it.`)) return;
    startTransition(async () => {
      const result = await archiveExercise(ex.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {exercises.map((ex) => (
          <li key={ex.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input value={ex.name} onChange={(e) => rename(ex, e.target.value)} className="max-w-xs" />
            <Select value={ex.categoryId ?? NO_CATEGORY} onValueChange={(v) => setCategory(ex, v)}>
              <SelectTrigger className="max-w-[10rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => archive(ex)} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New exercise" className="max-w-xs" />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="max-w-[10rem]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>No category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add exercise
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modality detail page**

```tsx
// app/(physical)/configuration/[modalityId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getModalityWithFields } from "@/lib/queries/physical";
import { Separator } from "@/components/ui/separator";
import { FieldEditor } from "../../_components/FieldEditor";
import { CategoryEditor } from "../../_components/CategoryEditor";
import { ExerciseEditor } from "../../_components/ExerciseEditor";

export const dynamic = "force-dynamic";

export default async function ModalityDetailPage({
  params,
}: {
  params: Promise<{ modalityId: string }>;
}) {
  const { modalityId } = await params;
  const data = await getModalityWithFields(modalityId);
  if (!data) notFound();

  const topFields = data.fields.filter((f) => f.scope === "top");
  const subrowFields = data.fields.filter((f) => f.scope === "subrow");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-8">
      <div>
        <Link
          href="/configuration"
          className="inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Configuration
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{data.modality.name}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top-level fields</h2>
        <FieldEditor modalityId={modalityId} scope="top" fields={topFields} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subrow fields</h2>
        <FieldEditor modalityId={modalityId} scope="subrow" fields={subrowFields} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <CategoryEditor modalityId={modalityId} categories={data.categories} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exercises</h2>
        <ExerciseEditor
          modalityId={modalityId}
          categories={data.categories}
          exercises={data.exercises}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Navigate to `/configuration/<gym-id>`. All editors render seeded data. Add/edit/remove field, category, exercise should round-trip without error.

- [ ] **Step 6: Commit**

```bash
git add app/\(physical\)/configuration/\[modalityId\] app/\(physical\)/_components/FieldEditor.tsx app/\(physical\)/_components/CategoryEditor.tsx app/\(physical\)/_components/ExerciseEditor.tsx
git commit -m "feat(physical): modality detail page with field, category, exercise editors"
```

---

## Phase 7 — Activities

### Task 14: Activity server actions

**Files:**
- Create: `app/(physical)/_actions/activities.ts`

- [ ] **Step 1: Implement**

```ts
// app/(physical)/_actions/activities.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activity, activitySubrow, physicalField } from "@/db/schema/physical";
import { activityPayloadSchema, type ActivityPayload } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function getFields(modalityId: string) {
  return db.select().from(physicalField).where(eq(physicalField.modalityId, modalityId));
}

export async function createActivity(
  modalityId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const fields = await getFields(modalityId);
  const schema = activityPayloadSchema(
    fields.filter((f) => f.scope === "top"),
    fields.filter((f) => f.scope === "subrow"),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const payload = parsed.data as ActivityPayload;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(activity)
      .values({
        modalityId,
        performedAt: payload.performedAt,
        values: payload.values,
        comment: payload.comment ?? null,
      })
      .returning({ id: activity.id });

    if (payload.subrows.length > 0) {
      await tx.insert(activitySubrow).values(
        payload.subrows.map((s) => ({
          activityId: row.id,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
    return row.id;
  });

  revalidatePhysicalRoutes({ activityId: id });
  return { ok: true, data: { id } };
}

export async function updateActivity(
  activityId: string,
  modalityId: string,
  raw: unknown,
): Promise<ActionResult> {
  const fields = await getFields(modalityId);
  const schema = activityPayloadSchema(
    fields.filter((f) => f.scope === "top"),
    fields.filter((f) => f.scope === "subrow"),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const payload = parsed.data as ActivityPayload;

  await db.transaction(async (tx) => {
    await tx
      .update(activity)
      .set({
        performedAt: payload.performedAt,
        values: payload.values,
        comment: payload.comment ?? null,
      })
      .where(eq(activity.id, activityId));
    await tx.delete(activitySubrow).where(eq(activitySubrow.activityId, activityId));
    if (payload.subrows.length > 0) {
      await tx.insert(activitySubrow).values(
        payload.subrows.map((s) => ({
          activityId,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
  });

  revalidatePhysicalRoutes({ activityId });
  return { ok: true, data: undefined };
}

export async function deleteActivity(activityId: string): Promise<ActionResult> {
  await db.delete(activity).where(eq(activity.id, activityId));
  revalidatePhysicalRoutes({ activityId });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(physical\)/_actions/activities.ts
git commit -m "feat(physical): add activity CRUD server actions"
```

### Task 15: SetArrayInput + DynamicActivityForm

**Files:**
- Create: `app/(physical)/_components/SetArrayInput.tsx`
- Create: `app/(physical)/_components/DynamicActivityForm.tsx`

- [ ] **Step 1: SetArrayInput**

```tsx
// app/(physical)/_components/SetArrayInput.tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SetEntry } from "@/db/schema/physical";

export function SetArrayInput({
  value,
  onChange,
}: {
  value: SetEntry[];
  onChange: (next: SetEntry[]) => void;
}) {
  function update(index: number, patch: Partial<SetEntry>) {
    const next = value.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { weight: 0, reps: 0 }]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sets.</p>
      ) : (
        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
          <Label className="text-xs">#</Label>
          <Label className="text-xs">Weight</Label>
          <Label className="text-xs">Reps</Label>
          <span />
          {value.map((s, i) => (
            <div key={i} className="contents">
              <div className="flex h-9 items-center text-sm text-muted-foreground">{i + 1}</div>
              <Input
                type="number"
                step="0.5"
                value={s.weight}
                onChange={(e) => update(i, { weight: Number(e.target.value) })}
              />
              <Input
                type="number"
                step="1"
                value={s.reps}
                onChange={(e) => update(i, { reps: Number(e.target.value) })}
              />
              <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="mr-2 h-4 w-4" /> Add set
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: DynamicActivityForm**

```tsx
// app/(physical)/_components/DynamicActivityForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mmSsToSeconds, secondsToMmSs } from "@/lib/physical/formatDuration";
import { computePace } from "@/lib/physical/pace";
import {
  type Category,
  type Exercise,
  type PhysicalField,
  type SetEntry,
} from "@/db/schema/physical";
import { SetArrayInput } from "./SetArrayInput";
import { createActivity, updateActivity } from "../_actions/activities";

type ValueMap = Record<string, unknown>;
type SubrowState = {
  exerciseId: string | null;
  values: ValueMap;
  sortOrder: number;
};

export type ActivityInitial = {
  id?: string;
  performedAt: Date;
  values: ValueMap;
  comment: string | null;
  subrows: SubrowState[];
};

const EXERCISE_NONE = "__none__";

function emptyValues(fields: PhysicalField[]): ValueMap {
  const out: ValueMap = {};
  for (const f of fields) {
    if (f.kind === "sets_array") out[f.key] = [];
    else out[f.key] = null;
  }
  return out;
}

function FieldInput({
  field,
  value,
  onChange,
  categories,
  exercises,
}: {
  field: PhysicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  categories: Category[];
  exercises: Exercise[];
}) {
  switch (field.kind) {
    case "text":
      return (
        <Textarea
          value={(value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          rows={2}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          step="1"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "decimal":
    case "distance_km":
      return (
        <Input
          type="number"
          step="0.01"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "duration_sec":
      return (
        <Input
          value={value == null ? "" : secondsToMmSs(value as number)}
          onChange={(e) => {
            const sec = mmSsToSeconds(e.target.value);
            onChange(sec);
          }}
          placeholder="mm:ss"
        />
      );
    case "sets_array":
      return (
        <SetArrayInput
          value={(value as SetEntry[] | null) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "category_ref":
      return (
        <Select
          value={(value as string | null) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "exercise_ref":
      return (
        <Select
          value={(value as string | null) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger><SelectValue placeholder="Exercise" /></SelectTrigger>
          <SelectContent>
            {exercises.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
  }
}

export function DynamicActivityForm({
  modalityId,
  fields,
  categories,
  exercises,
  initial,
}: {
  modalityId: string;
  fields: PhysicalField[];
  categories: Category[];
  exercises: Exercise[];
  initial?: ActivityInitial;
}) {
  const router = useRouter();
  const topFields = fields.filter((f) => f.scope === "top").sort((a, b) => a.sortOrder - b.sortOrder);
  const subrowFields = fields.filter((f) => f.scope === "subrow").sort((a, b) => a.sortOrder - b.sortOrder);

  const [performedAt, setPerformedAt] = useState<Date>(initial?.performedAt ?? new Date());
  const [values, setValues] = useState<ValueMap>(initial?.values ?? emptyValues(topFields));
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [subrows, setSubrows] = useState<SubrowState[]>(initial?.subrows ?? []);
  const [pending, startTransition] = useTransition();

  function setValue(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function setSubrowValue(idx: number, key: string, v: unknown) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], values: { ...next[idx].values, [key]: v } };
      return next;
    });
  }

  function setSubrowExercise(idx: number, exerciseId: string | null) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], exerciseId };
      return next;
    });
  }

  function addSubrow() {
    setSubrows((prev) => [
      ...prev,
      { exerciseId: null, values: emptyValues(subrowFields), sortOrder: prev.length },
    ]);
  }

  function removeSubrow(idx: number) {
    setSubrows((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
  }

  function moveSubrow(idx: number, direction: -1 | 1) {
    const next = idx + direction;
    if (next < 0 || next >= subrows.length) return;
    setSubrows((prev) => {
      const out = prev.slice();
      [out[idx], out[next]] = [out[next], out[idx]];
      return out.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  function submit() {
    const payload = {
      performedAt,
      values,
      comment: comment.trim() === "" ? null : comment,
      subrows,
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updateActivity(initial.id, modalityId, payload)
        : await createActivity(modalityId, payload);
      if (!result.ok) return toast.error(result.error);
      toast.success(initial?.id ? "Activity updated" : "Activity logged");
      router.push("/activities");
    });
  }

  const distanceField = topFields.find((f) => f.kind === "distance_km");
  const durationField = topFields.find((f) => f.kind === "duration_sec" && f.key !== "pace");
  const pace =
    distanceField && durationField
      ? computePace(
          Number(values[distanceField.key] ?? 0),
          Number(values[durationField.key] ?? 0),
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Performed at</Label>
        <Input
          type="datetime-local"
          value={toLocalInputValue(performedAt)}
          onChange={(e) => setPerformedAt(new Date(e.target.value))}
        />
      </div>

      {topFields.map((f) => (
        <div key={f.id} className="space-y-2">
          <Label>
            {f.label}
            {f.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
          <FieldInput
            field={f}
            value={values[f.key]}
            onChange={(v) => setValue(f.key, v)}
            categories={categories}
            exercises={exercises}
          />
          {f.kind === "duration_sec" && f.key === "pace" && pace != null ? (
            <p className="text-xs text-muted-foreground">Computed from distance + duration: {secondsToMmSs(pace)} / km</p>
          ) : null}
        </div>
      ))}

      {subrowFields.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Subrows</Label>
            <Button size="sm" variant="outline" onClick={addSubrow}>
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>
          {subrows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No subrows.</p>
          ) : null}
          {subrows.map((row, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeSubrow(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exercise</Label>
                <Select
                  value={row.exerciseId ?? EXERCISE_NONE}
                  onValueChange={(v) => setSubrowExercise(idx, v === EXERCISE_NONE ? null : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXERCISE_NONE}>None</SelectItem>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subrowFields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>
                    {f.label}
                    {f.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </Label>
                  <FieldInput
                    field={f}
                    value={row.values[f.key]}
                    onChange={(v) => setSubrowValue(idx, f.key, v)}
                    categories={categories}
                    exercises={exercises}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Comment</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button onClick={submit} disabled={pending}>{initial?.id ? "Save" : "Log activity"}</Button>
      </div>
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(physical\)/_components/SetArrayInput.tsx app/\(physical\)/_components/DynamicActivityForm.tsx
git commit -m "feat(physical): dynamic activity form with subrows and set array input"
```

### Task 16: Activities list + new + detail pages

**Files:**
- Create: `app/(physical)/_components/ActivityList.tsx`
- Create: `app/(physical)/_components/ActivityFilters.tsx`
- Replace: `app/(physical)/activities/page.tsx`
- Create: `app/(physical)/activities/new/page.tsx`
- Create: `app/(physical)/activities/[id]/page.tsx`

- [ ] **Step 1: ActivityFilters**

```tsx
// app/(physical)/_components/ActivityFilters.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Modality } from "@/db/schema/physical";

const ALL = "__all__";

export function ActivityFilters({ modalities }: { modalities: Modality[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const modality = params.get("modality") ?? ALL;

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    router.push(`/activities?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Modality</span>
      <Select value={modality} onValueChange={(v) => set("modality", v)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {modalities.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: ActivityList**

```tsx
// app/(physical)/_components/ActivityList.tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ActivityListRow } from "@/lib/queries/physical";

export function ActivityList({ rows }: { rows: ActivityListRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No activities yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/activities/${r.id}`}>
            <Card className="px-4 py-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{r.modalityName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.performedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.subrowCount} {r.subrowCount === 1 ? "row" : "rows"}
                </div>
              </div>
              {r.comment ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>
              ) : null}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Activities page**

```tsx
// app/(physical)/activities/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActivities, getModalities } from "@/lib/queries/physical";
import { ActivityFilters } from "../_components/ActivityFilters";
import { ActivityList } from "../_components/ActivityList";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const [modalities, rows] = await Promise.all([
    getModalities(),
    getActivities({ modalityId }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">Log and review sessions.</p>
        </div>
        <Link href="/activities/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log activity</Button>
        </Link>
      </div>
      <ActivityFilters modalities={modalities} />
      <ActivityList rows={rows} />
    </div>
  );
}
```

- [ ] **Step 4: New activity page**

```tsx
// app/(physical)/activities/new/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getModalities, getModalityWithFields } from "@/lib/queries/physical";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicActivityForm } from "../../_components/DynamicActivityForm";

export const dynamic = "force-dynamic";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const modalities = await getModalities();
  if (modalities.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">No modalities configured.</p>
      </div>
    );
  }

  if (!modalityId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-4">
        <Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> Activities
        </Link>
        <h1 className="text-2xl font-semibold">Pick a modality</h1>
        <ul className="space-y-2">
          {modalities.map((m) => (
            <li key={m.id}>
              <a
                href={`/activities/new?modality=${m.id}`}
                className="block rounded-md border px-4 py-3 hover:bg-accent"
              >
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const data = await getModalityWithFields(modalityId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Activities
      </Link>
      <h1 className="text-2xl font-semibold">New {data.modality.name} activity</h1>
      <DynamicActivityForm
        modalityId={modalityId}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
      />
    </div>
  );
}
```

- [ ] **Step 5: Activity detail page**

```tsx
// app/(physical)/activities/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActivity } from "@/lib/queries/physical";
import { DynamicActivityForm } from "../../_components/DynamicActivityForm";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getActivity(id);
  if (!data) notFound();

  const subrows = data.subrows.map((s) => ({
    exerciseId: s.exerciseId,
    values: (s.values ?? {}) as Record<string, unknown>,
    sortOrder: s.sortOrder,
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Activities
      </Link>
      <h1 className="text-2xl font-semibold">{data.modality.name} activity</h1>
      <DynamicActivityForm
        modalityId={data.modality.id}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
        initial={{
          id: data.activity.id,
          performedAt: data.activity.performedAt,
          values: (data.activity.values ?? {}) as Record<string, unknown>,
          comment: data.activity.comment,
          subrows,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

- `/activities`: empty state, then "Log activity".
- Pick Gym → form renders top + subrow editor + comment.
- Submit → toast, redirect to list, row appears.
- Click row → edit form prefilled.
- Pick Running → distance, duration, pace inputs; comment; splits in subrows; pace hint shows.

- [ ] **Step 7: Commit**

```bash
git add app/\(physical\)/activities app/\(physical\)/_components/ActivityFilters.tsx app/\(physical\)/_components/ActivityList.tsx
git commit -m "feat(physical): activities list, new, and detail pages"
```

---

## Phase 8 — Plans

### Task 17: Plan server actions

**Files:**
- Create: `app/(physical)/_actions/plans.ts`

- [ ] **Step 1: Implement**

```ts
// app/(physical)/_actions/plans.ts
"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { physicalField, plan, planSubrow } from "@/db/schema/physical";
import { planPayloadSchema } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function getSubrowFields(modalityId: string) {
  return db
    .select()
    .from(physicalField)
    .where(eq(physicalField.modalityId, modalityId));
}

export async function createPlan(modalityId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const fields = await getSubrowFields(modalityId);
  const schema = planPayloadSchema(fields.filter((f) => f.scope === "subrow"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(plan)
      .values({ modalityId, name: data.name, notes: data.notes ?? null })
      .returning({ id: plan.id });
    if (data.subrows.length > 0) {
      await tx.insert(planSubrow).values(
        data.subrows.map((s) => ({
          planId: row.id,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
    return row.id;
  });

  revalidatePhysicalRoutes({ planId: id });
  return { ok: true, data: { id } };
}

export async function updatePlan(planId: string, modalityId: string, raw: unknown): Promise<ActionResult> {
  const fields = await getSubrowFields(modalityId);
  const schema = planPayloadSchema(fields.filter((f) => f.scope === "subrow"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(plan)
      .set({ name: data.name, notes: data.notes ?? null, updatedAt: sql`now()` })
      .where(eq(plan.id, planId));
    await tx.delete(planSubrow).where(eq(planSubrow.planId, planId));
    if (data.subrows.length > 0) {
      await tx.insert(planSubrow).values(
        data.subrows.map((s) => ({
          planId,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
  });
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}

export async function archivePlan(planId: string): Promise<ActionResult> {
  await db
    .update(plan)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(plan.id, planId));
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  await db.delete(plan).where(eq(plan.id, planId));
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck`

```bash
git add app/\(physical\)/_actions/plans.ts
git commit -m "feat(physical): add plan CRUD server actions"
```

### Task 18: Plan form + list + detail + new pages

**Files:**
- Create: `app/(physical)/_components/PlanForm.tsx`
- Create: `app/(physical)/_components/PlanList.tsx`
- Replace: `app/(physical)/plans/page.tsx`
- Create: `app/(physical)/plans/new/page.tsx`
- Create: `app/(physical)/plans/[id]/page.tsx`

- [ ] **Step 1: PlanForm**

```tsx
// app/(physical)/_components/PlanForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mmSsToSeconds, secondsToMmSs } from "@/lib/physical/formatDuration";
import {
  type Category,
  type Exercise,
  type PhysicalField,
  type SetEntry,
} from "@/db/schema/physical";
import { SetArrayInput } from "./SetArrayInput";
import { createPlan, updatePlan } from "../_actions/plans";

type ValueMap = Record<string, unknown>;
type SubrowState = { exerciseId: string | null; values: ValueMap; sortOrder: number };

export type PlanInitial = {
  id?: string;
  name: string;
  notes: string | null;
  subrows: SubrowState[];
};

const EXERCISE_NONE = "__none__";

function emptyValues(fields: PhysicalField[]): ValueMap {
  const out: ValueMap = {};
  for (const f of fields) {
    if (f.kind === "sets_array") out[f.key] = [];
    else out[f.key] = null;
  }
  return out;
}

function SubrowFieldInput({
  field,
  value,
  onChange,
  categories,
}: {
  field: PhysicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  categories: Category[];
}) {
  switch (field.kind) {
    case "text":
      return (
        <Input value={(value as string | null) ?? ""} onChange={(e) => onChange(e.target.value || null)} />
      );
    case "number":
      return (
        <Input
          type="number" step="1"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "decimal":
    case "distance_km":
      return (
        <Input
          type="number" step="0.01"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "duration_sec":
      return (
        <Input
          value={value == null ? "" : secondsToMmSs(value as number)}
          onChange={(e) => onChange(mmSsToSeconds(e.target.value))}
          placeholder="mm:ss"
        />
      );
    case "sets_array":
      return <SetArrayInput value={(value as SetEntry[] | null) ?? []} onChange={onChange} />;
    case "category_ref":
      return (
        <Select value={(value as string | null) ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "exercise_ref":
      return null; // exercise_ref doesn't make sense inside a subrow; use the row-level exercise selector
  }
}

export function PlanForm({
  modalityId,
  fields,
  categories,
  exercises,
  initial,
}: {
  modalityId: string;
  fields: PhysicalField[];
  categories: Category[];
  exercises: Exercise[];
  initial?: PlanInitial;
}) {
  const router = useRouter();
  const subrowFields = fields.filter((f) => f.scope === "subrow").sort((a, b) => a.sortOrder - b.sortOrder);

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [subrows, setSubrows] = useState<SubrowState[]>(initial?.subrows ?? []);
  const [pending, startTransition] = useTransition();

  function setSubrowValue(idx: number, key: string, v: unknown) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], values: { ...next[idx].values, [key]: v } };
      return next;
    });
  }

  function setSubrowExercise(idx: number, exerciseId: string | null) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], exerciseId };
      return next;
    });
  }

  function addSubrow() {
    setSubrows((prev) => [
      ...prev,
      { exerciseId: null, values: emptyValues(subrowFields), sortOrder: prev.length },
    ]);
  }

  function removeSubrow(idx: number) {
    setSubrows((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
  }

  function moveSubrow(idx: number, direction: -1 | 1) {
    const next = idx + direction;
    if (next < 0 || next >= subrows.length) return;
    setSubrows((prev) => {
      const out = prev.slice();
      [out[idx], out[next]] = [out[next], out[idx]];
      return out.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  function submit() {
    const payload = {
      name,
      notes: notes.trim() === "" ? null : notes,
      subrows,
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updatePlan(initial.id, modalityId, payload)
        : await createPlan(modalityId, payload);
      if (!result.ok) return toast.error(result.error);
      toast.success(initial?.id ? "Plan updated" : "Plan created");
      router.push("/plans");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day A" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Goal, intent, references…" />
      </div>

      {subrowFields.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Planned rows</Label>
            <Button size="sm" variant="outline" onClick={addSubrow}>
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>
          {subrows.length === 0 ? <p className="text-xs text-muted-foreground">No rows yet.</p> : null}
          {subrows.map((row, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeSubrow(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exercise</Label>
                <Select
                  value={row.exerciseId ?? EXERCISE_NONE}
                  onValueChange={(v) => setSubrowExercise(idx, v === EXERCISE_NONE ? null : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXERCISE_NONE}>None</SelectItem>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subrowFields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>{f.label}{f.required ? <span className="ml-1 text-destructive">*</span> : null}</Label>
                  <SubrowFieldInput
                    field={f}
                    value={row.values[f.key]}
                    onChange={(v) => setSubrowValue(idx, f.key, v)}
                    categories={categories}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button onClick={submit} disabled={pending || !name.trim()}>{initial?.id ? "Save" : "Create plan"}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PlanList**

```tsx
// app/(physical)/_components/PlanList.tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PlanListRow } from "@/lib/queries/physical";

export function PlanList({ rows }: { rows: PlanListRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No plans yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={`/plans/${p.id}`}>
            <Card className="px-4 py-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.modalityName}</div>
                </div>
              </div>
              {p.notes ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>
              ) : null}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Plans list page**

```tsx
// app/(physical)/plans/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModalities, getPlans } from "@/lib/queries/physical";
import { PlanList } from "../_components/PlanList";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const [modalities, rows] = await Promise.all([
    getModalities(),
    getPlans({ modalityId }),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="text-sm text-muted-foreground">Reference workout templates.</p>
        </div>
        <Link href="/plans/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New plan</Button>
        </Link>
      </div>
      <div className="text-xs text-muted-foreground">
        {modalities.length === 0 ? "No modalities configured." : null}
      </div>
      <PlanList rows={rows} />
    </div>
  );
}
```

- [ ] **Step 4: New plan page**

```tsx
// app/(physical)/plans/new/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getModalities, getModalityWithFields } from "@/lib/queries/physical";
import { PlanForm } from "../../_components/PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const modalityId = typeof sp.modality === "string" ? sp.modality : undefined;
  const modalities = await getModalities();
  if (modalities.length === 0) {
    return <div className="mx-auto max-w-2xl px-6 py-8">No modalities.</div>;
  }
  if (!modalityId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-4">
        <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> Plans
        </Link>
        <h1 className="text-2xl font-semibold">Pick a modality</h1>
        <ul className="space-y-2">
          {modalities.map((m) => (
            <li key={m.id}>
              <a href={`/plans/new?modality=${m.id}`} className="block rounded-md border px-4 py-3 hover:bg-accent">
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const data = await getModalityWithFields(modalityId);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <h1 className="text-2xl font-semibold">New {data.modality.name} plan</h1>
      <PlanForm
        modalityId={modalityId}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
      />
    </div>
  );
}
```

- [ ] **Step 5: Plan detail page**

```tsx
// app/(physical)/plans/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPlan } from "@/lib/queries/physical";
import { PlanForm } from "../../_components/PlanForm";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlan(id);
  if (!data) notFound();
  const subrows = data.subrows.map((s) => ({
    exerciseId: s.exerciseId,
    values: (s.values ?? {}) as Record<string, unknown>,
    sortOrder: s.sortOrder,
  }));
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Plans
      </Link>
      <h1 className="text-2xl font-semibold">{data.plan.name}</h1>
      <p className="text-xs text-muted-foreground">{data.modality.name}</p>
      <PlanForm
        modalityId={data.modality.id}
        fields={data.fields}
        categories={data.categories}
        exercises={data.exercises}
        initial={{
          id: data.plan.id,
          name: data.plan.name,
          notes: data.plan.notes,
          subrows,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify + commit**

Visit `/plans` → empty → create "Push Day A" with rows → list shows it → edit round-trips.

```bash
git add app/\(physical\)/plans app/\(physical\)/_components/PlanForm.tsx app/\(physical\)/_components/PlanList.tsx
git commit -m "feat(physical): plans list, new, and detail pages"
```

---

## Phase 9 — Final verification

### Task 19: Type, lint, test, smoke

- [ ] **Step 1: Full pass**

Run in parallel:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: all green. Fix any failures inline.

- [ ] **Step 2: Manual smoke**

Start dev server (`pnpm dev`):

- Sidebar shows Physical Activities group expanded on its routes.
- `/configuration` lists Gym + Running.
- Open Gym → add/edit/remove field, category, exercise.
- `/activities/new` for Gym → add 2 exercises with sets → submit → row appears.
- `/activities/new` for Running → distance + duration + pace + 2 split rows → submit → row appears.
- `/plans/new` for Gym → name + rows → submit → row appears in `/plans`.
- Edit and delete an activity; edit and archive a plan.

- [ ] **Step 3: Commit any fixups + push**

If any fixups were needed:

```bash
git add -A
git commit -m "fix(physical): smoke pass adjustments"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Sidebar grouping | Task 1 |
| Route group + placeholders | Task 2 |
| Schema (8 tables + enums) | Task 3 |
| Seed migration | Task 4 |
| Pure logic (pace, duration, set summary) | Tasks 5–7 |
| Validation builder | Task 8 |
| Reads + revalidate | Task 9 |
| Modality CRUD | Task 10 |
| Field/category/exercise CRUD | Task 11 |
| Configuration list page | Task 12 |
| Modality detail page + editors | Task 13 |
| Activity CRUD | Task 14 |
| Dynamic activity form + sets input | Task 15 |
| Activities list/new/detail | Task 16 |
| Plan CRUD | Task 17 |
| Plans list/new/detail | Task 18 |
| Final verification | Task 19 |

**Placeholder scan:** none remain.

**Type consistency:** `ActivityListRow`, `ActivityDetail`, `PlanListRow`, `PlanDetail`, `ModalityWithFields` shared between queries and consumers. `ValueMap` aliased only within form modules. `SubrowState` shape identical in `DynamicActivityForm` and `PlanForm`.
