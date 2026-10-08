# Activity Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Omogućiti jednostavan i konfigurabilan unos trčanja, teretane i kombinovanih treninga kroz delove, uz šablone i prečice.

**Architecture:** Zadržati postojeće aktivnosti i redove kao osnovu, uz aditivne metapodatke i oznake delova. Čiste domenske funkcije vode adaptaciju istorijskih zapisa, pripremu nacrta, superserije i zbirove; forme aktivnosti i šablona dele editor delova. Server actions validiraju reference i čuvaju povezane podatke transakciono.

**Tech Stack:** Next.js 16.3.2 App Router, React 19.2.8, TypeScript, postojeći shadcn/Radix UI, Drizzle 0.45.2, PostgreSQL, Zod 4.4.3, Vitest 4.1.7; pnpm 10.24.0.

**Spec:** `docs/superpowers/specs/2026-10-08-activity-recording-design.md` — korisnik odobrio 2026-10-08.

## Global Constraints

- Jedna aktivnost predstavlja jedan trening sa delovima koji se izvršavaju redom.
- Postojeće konfigurabilne grupe i opcije, naročito region i vrsta trčanja, ostaju dostupne.
- Planirane vrednosti i stvarni rezultati imaju različito značenje.
- Relevantni Next.js vodiči iz `node_modules/next/dist/docs/` moraju se pročitati pre izmene aplikacionog koda.
- Sistemske oznake novog toka su na srpskom; korisnički nazivi ostaju kako su uneti.
- Nema masovnog prepisivanja postojećih aktivnosti.
- Migracije ne menjaju već primenjene SQL datoteke.
- Aktivni sistem migracija je `scripts/migrate.mjs` sa direktorijumom `db/unified-migrations/`.
- Ne dodaju se novi paketi bez konkretne potrebe.
- Telefon i desktop: nema horizontalnog skrolovanja pri širini 375 px, izbori i akcije dostupni tastaturom, vidljiv fokus, oba režima boja; greška čuvanja ne resetuje unos.
- Automatski uvoz sa Strave, GPS, tajmer, raspoređivanje nedelja i programiranje treninga nisu deo ove implementacije.
- Prečice ne stvaraju aktivnosti bez eksplicitnog čuvanja; aplikaciona implementacija i produkciona migracija nisu deo pisanja ovog plana.
- Projektni AGENTS.md dozvoljava commitove samo završenih izmena ovog projekta. Ne amendovati i ne uključivati tuđe izmene. Izolaciju radnog stabla izabrati pri početku izvršenja.

## Review Focus

1. Preuređen ili obrisan deo usred superserije: unosi prate svoj identitet i nepovezane vežbe ne postaju superserija (Task 1).
2. Premestena grupa oznaka ili arhivirana vežba: istorijski izbori ostaju vidljivi i izmenjivi, bez promena izazvanih preimenovanjem (Tasks 2–3).
3. Poznati kilometri uz sprint na vreme ili zagrevanje bez kilometara: prikaz ne tvrdi da je zbir potpun i ne računa pogrešan prosek (Tasks 1, 6).
4. Izvor izabran preko popunjene forme ili neuspešno čuvanje: otkazivanje i greške ne gube nacrt (Tasks 4–5).
5. Nasleđeni JSON ključevi i planovi bez izabranih vežbi: izmena čuva dodatne podatke, ciljevi se ne pretvaraju u rezultate (Tasks 1–2, 5).

## Mapa datoteka i odgovornosti

| Datoteke | Odgovornost |
|---|---|
| `lib/physical/types.ts` | Tipovi delova, ciljeva, oznaka, nacrta i rezultata |
| `lib/physical/blocks.ts`, `drafts.ts`, `activitySummary.ts`, `tagSelection.ts` | Adaptacija, preuređivanje, priprema izvora, zbirovi, vidljivost oznaka |
| `lib/validation/physical.ts` | Validacija novih i istorijskih payloadova |
| `db/schema/physical.ts`, `db/unified-migrations/0010_activity_blocks.sql` | Aditivni model i migracija; broj proveriti da je slobodan pre kreiranja |
| `lib/physical/repository.ts` | Transakcioni upis aktivnosti/šablona, provera referenci sa DB instancom kao argumentom |
| `lib/queries/physical.ts`, fizičke server actions | Učitavanje, pozivanje repository-ja i revalidacija |
| `app/(physical)/_components/TagGroupEditor.tsx`, `TagSelection.tsx` | Konfiguracija mesta prikaza i zajednički izbor oznaka |
| `app/(physical)/_components/activity/` | `ActivityForm`, `BlockEditor`, `BlockCard`, `RunFields`, `SprintFields`, `ExerciseFields`, `NumberInput`, `DurationFields`, `SourcePicker` |
| `app/(physical)/_components/SetArrayInput.tsx` | Serije na ponavljanja/vreme i postojeći modifikatori |
| `app/(physical)/_components/WorkoutPlanForm.tsx` | Editor šablona koji koristi zajedničke delove |
| `app/(physical)/_components/ActivityList.tsx`, `ActivityOverview.tsx` | Pregled i smisleni zbirovi |
| `app/(physical)/activities/` i `plans/workouts/` page datoteke | Server učitavanje i povezivanje prikaza sa editorima |
| `lib/physical/*.test.ts`, `lib/validation/physical.test.ts` | Čiste poslovne provere i validacija |
| `tests/physical/support/database.ts`, `tests/physical/integration/recording.test.ts` | Izolovana PostgreSQL provera migracije i transakcija |
| `vitest.config.ts`, `package.json` | Posebno uključivanje/rutina fizičkih integracionih testova |

## Task 1: Domenski model, adaptacija i proračuni

**Files:** Create `lib/physical/types.ts`, `blocks.ts`, `drafts.ts`, `activitySummary.ts`, `tagSelection.ts` and matching `.test.ts` files; modify `lib/validation/physical.ts`, `lib/validation/physical.test.ts`, `lib/physical/setSummary.ts` and its tests.

**Interfaces:** Domenski tipovi ne uvoze DB u runtime-u. Sledeći ugovori su osnova ostalih zadataka:

```ts
export type BlockKind = "exercise" | "split" | "sprint";
export type EntryMode = "running" | "gym" | "mixed";
export type BlockStatus = "pending" | "done" | "skipped";
export type NumericRange = { min: number; max: number };
export type SetEntry = {
  weight?: number; reps?: number; durationSec?: number;
  bodyweight?: boolean; warmup?: boolean; perSide?: boolean;
};
export type BlockTargets = {
  distanceKm?: NumericRange; durationSec?: NumericRange;
  repetitions?: NumericRange; sprintDistanceM?: NumericRange;
  sprintDurationSec?: NumericRange; restSec?: NumericRange;
  setCount?: NumericRange; reps?: NumericRange;
};
export type BlockDetails = {
  version: 1; label: string | null; note: string | null;
  status: BlockStatus; targets: BlockTargets; linkNext: boolean;
  restSec: number | null; optional: boolean;
};
export type TrainingBlock = {
  id?: string; rowKey: string; kind: BlockKind; exerciseId: string | null;
  values: Record<string, unknown>; details: BlockDetails;
  tagIds: string[]; sortOrder: number;
};
export type StoredBlock = Omit<TrainingBlock, "rowKey" | "details" | "tagIds"> & {
  id: string; details: BlockDetails | null; tagIds?: string[];
};
export type PlanBlock = Omit<TrainingBlock, "rowKey" | "details"> & {
  details: Omit<BlockDetails, "status">;
};
export type PlanBlocks = { version: 1; items: PlanBlock[] };
export type ActivityDraft = {
  id?: string; title: string | null; performedAt: Date;
  values: Record<string, unknown>; comment: string | null;
  stravaUrl: string | null; tagIds: string[]; blocks: TrainingBlock[];
};
export type ActivityWrite = Omit<ActivityDraft, "id" | "blocks"> & {
  subrows: Omit<TrainingBlock, "rowKey">[];
};
export type TagPlacement = {
  scope: "session" | "block"; modes: EntryMode[]; kinds: BlockKind[];
};
export type GroupConfig = { id: string; placement: TagPlacement | null };
export type TagRef = { id: string; groupId: string };
export type TagContext = { scope: "session"; mode: EntryMode } |
  { scope: "block"; kind: BlockKind };
export type Summary = {
  distanceKm: number; distanceComplete: boolean;
  activeRunSeconds: number; timeComplete: boolean;
  runPaceSeconds: number | null; exerciseCount: number; setCount: number;
};
```

Functions implemented in their mapped files:

```ts
export function newBlock(kind: BlockKind): TrainingBlock;
export function adaptStoredBlock(row: StoredBlock): TrainingBlock;
export function moveBlock(rows: TrainingBlock[], index: number, direction: -1 | 1): TrainingBlock[];
export function removeBlock(rows: TrainingBlock[], index: number): TrainingBlock[];
export function duplicateBlock(rows: TrainingBlock[], index: number): TrainingBlock[];
export function inferEntryMode(rows: TrainingBlock[], fallback: EntryMode): EntryMode;
export function toActivityWrite(draft: ActivityDraft): ActivityWrite;
export function repeatActivity(source: ActivityDraft, today: Date): ActivityDraft;
export function draftFromPlan(plan: { name: string; notes: string | null; tagIds: string[]; blocks: PlanBlocks }, today: Date): ActivityDraft;
export function planFromActivity(source: ActivityDraft, resultsAsTargets: boolean): PlanBlocks;
export function summarizeActivity(rows: TrainingBlock[]): Summary;
export function visibleGroups(groups: GroupConfig[], tags: TagRef[], selectedIds: string[], context: TagContext): GroupConfig[];
export function tagConflicts(tagIds: string[], tags: TagRef[]): { groupId: string; tagIds: string[] }[];
```

- [ ] **Step 1: Add meaningful failing domain tests.** Each test file defines its own local fixtures using `newBlock`; no global test-only scaffolding.

```ts
it("keeps input identity and breaks a split superset", () => {
  const a = newBlock("exercise"), b = newBlock("exercise"), run = newBlock("split");
  a.values = { sets: [{ weight: 80, reps: 5 }] };
  b.values = { sets: [{ reps: 8, bodyweight: true }] };
  a.details.linkNext = true;
  const moved = moveBlock([a, b, run], 2, -1);
  expect(moved.map(x => x.rowKey)).toEqual([a.rowKey, run.rowKey, b.rowKey]);
  expect(moved[0].values).toEqual(a.values);
  expect(moved.every(x => !x.details.linkNext)).toBe(true);
  const deleted = removeBlock([a, b, run], 1);
  expect(deleted[0].details.linkNext).toBe(false);
});
it("does not invent distance or use incomplete pace", () => {
  const run = newBlock("split"), warmup = newBlock("split"), sprint = newBlock("sprint");
  for (const b of [run, warmup, sprint]) b.details.status = "done";
  run.values = { distance: 4, duration: 1200 };
  warmup.values = { duration: 420 };
  sprint.values = { sprintReps: 4, sprintDuration: 10, sprintRest: 120 };
  expect(summarizeActivity([run, warmup, sprint])).toMatchObject({
    distanceKm: 4, distanceComplete: false, activeRunSeconds: 1660,
    runPaceSeconds: null, exerciseCount: 0,
  });
});
```

Add tests for skipped/pending exclusion, weighted run pace `sum(duration)/sum(distance)`, distance-only runs, legacy manual pace preservation, duplication with new keys, unknown JSON values, duration-only exercise series, source immutability and label-only targets. Empty groups remain harmless. Cross-group tag selections do not conflict, two tags from the same group do.

- [ ] **Step 2: Run tests red.** `pnpm exec vitest run lib/physical/blocks.test.ts lib/physical/drafts.test.ts lib/physical/activitySummary.test.ts lib/physical/tagSelection.test.ts`. Expected: missing exports/modules before implementation, then business assertion failures if partially implemented.

- [ ] **Step 3: Implement adapters and transformations.** `newBlock` assigns a fresh UUID, empty values and pending status. `adaptStoredBlock` preserves all values and assigns legacy null details a done status; it does not synthesize distance, time or tags. Only discard truly empty new rows in `toActivityWrite`. Regenerate sortOrder after every structure change. Normalize `linkNext` by surviving original adjacent row identities: deleting B from A→B→C never creates A→C. Last row and non-exercise rows always have false links. Read-only reference results belong to source picker/form props, never to new `values`.

```ts
export function repeatActivity(source: ActivityDraft, today: Date): ActivityDraft {
  return {
    title: source.title, performedAt: new Date(today), values: {},
    comment: null, stravaUrl: null, tagIds: [...source.tagIds],
    blocks: source.blocks.map((b, sortOrder) => ({
      ...structuredClone(b), id: undefined, rowKey: crypto.randomUUID(), sortOrder,
      values: {}, details: { ...structuredClone(b.details), status: "pending" },
    })),
  };
}
```

Plan source may set planned set count, but empty series inputs must not be serialized as accomplished results. `planFromActivity` keeps structure and explicit targets; it copies performed numeric values into singleton ranges only when `resultsAsTargets` is true. PlanBlock.values is reserved for non-result custom configuration, never sets/distance/duration/pace/sprint actuals. Do not copy historical comments/Strava URLs.

- [ ] **Step 4: Extend runtime validation and summaries.** Keep legacy payload acceptance for null/omitted details and legacy zero placeholders; details.version=1 uses done-state refinements. Done run requires positive distance or duration. Done sprint requires positive integer sprintReps plus positive sprintDistance or sprintDuration. Done exercise requires exerciseId and at least one series with positive reps XOR durationSec; absent weight is valid, negative weight is not. Rest allows zero, max >= min for all target ranges. Pending/skipped values, if present, must still be numerically valid. Deduplicate tagIds; one per group checked with loaded reference data. Unknown values keys survive Zod `.loose()` parsing.

```ts
it("accepts recovery on time without invented weight", () => {
  expect(setEntrySchema.safeParse({ durationSec: 45 }).success).toBe(true);
  expect(setEntrySchema.safeParse({ reps: 3, durationSec: 45 }).success).toBe(false);
  expect(setEntrySchema.safeParse({ weight: -1, reps: 3 }).success).toBe(false);
});
```

Update `setSummary` to use absent reps/weight as zero for existing numeric sums; time series do not fabricate repetitions or volume. A sprint with known duration contributes reps × sprintDuration to activeRunSeconds; rest and exercises are excluded. Pace aggregates only noninterval done run blocks and only if each has both metrics. Missing numeric values mark completeness false; null summary pace is shown as unavailable.

- [ ] **Step 5: Run domain and existing physical tests green.** `pnpm exec vitest run lib/physical lib/validation/physical.test.ts`. Review public exports against these contracts; commit only this task's files after passing.

**Deliverable:** Independently tested interpretation of old/new training data and consistent transformations; no database or UI change yet.

## Task 2: Additive persistence, reference integrity and queries

**Files:** Modify `db/schema/physical.ts`, `lib/queries/physical.ts`, `_actions/activities.ts`, `_actions/workoutPlans.ts`, `_actions/exercises.ts`, `_actions/_revalidate.ts`, `vitest.config.ts`, `package.json`; create `db/unified-migrations/0010_activity_blocks.sql`, `lib/physical/repository.ts`, `tests/physical/support/database.ts`, `tests/physical/integration/recording.test.ts`.

**Interfaces:** Re-export domain `SetEntry` and alias existing `SubrowKind` to BlockKind in schema. Add nullable typed columns for details/title/blocks/placement, plus activitySubrowTag relation. Keep existing action names and legacy payloads working. Repository consumes `ActivityWrite` and validated plans with DB passed explicitly:

```ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as physicalSchema from "@/db/schema/physical";
export type PhysicalDb = NodePgDatabase<typeof physicalSchema>;
export type PlanWrite = { name: string; notes: string | null; blocks: PlanBlocks };
export async function saveActivity(database: PhysicalDb, payload: ActivityWrite, id?: string): Promise<string>;
export async function saveWorkoutPlan(database: PhysicalDb, payload: PlanWrite, id?: string): Promise<string>;
export async function removeExercise(database: PhysicalDb, id: string): Promise<void>;
```

The production database contains the physical schema among its tables; use its typed physical subset and the test database's physical schema for repository operations. Query changes: `ActivityDetail.subrows` include tagIds; `getActivities` rows include `summary: Summary`, tagIds from the session and blocks deduplicated; `getExercises(includeIds: string[] = [])` includes active catalog plus referenced archived IDs. `getWorkoutPlan` returns existing exercises and nullable blocks; callers use blocks first, then legacy adapter.

- [ ] **Step 1: Add failing PostgreSQL tests.** Mirror testcontainers + Pool cleanup from finance support in physical support, use physical Drizzle schema, and run `migrate(pool)` on a fresh container database. This suite must never use DATABASE_URL from the user's environment. Change Vitest include to `tests/physical/integration/**/*.test.ts`; extend default unit scripts' exclusion to this directory, and add `test:physical:integration` invoking it with maxWorkers=1. Tests use real migrations and repository, not mocked SQL builders.

```ts
// recording.test.ts: beforeAll creates the isolated DB and runs migrate(pool).
it("preserves unknown values and block tags through update", async () => {
  const [{ id: groupId }] = await database.db.insert(activityTagGroup)
    .values({ name: "Vrsta trčanja" }).returning();
  const [{ id: tagId }] = await database.db.insert(activityTag)
    .values({ groupId, name: "Tempo" }).returning();
  const block = newBlock("split");
  block.details.status = "done";
  block.values = { distance: 5, duration: 1500, customKey: "keep" };
  block.tagIds = [tagId];
  const draft: ActivityDraft = {
    performedAt: new Date("2026-10-08T10:00:00Z"), title: null,
    values: { customTop: 9 }, comment: null, stravaUrl: null,
    tagIds: [], blocks: [block],
  };
  const id = await saveActivity(database.db, toActivityWrite(draft));
  await saveActivity(database.db, toActivityWrite(draft), id);
  const [row] = await database.db.select().from(activitySubrow)
    .where(eq(activitySubrow.activityId, id));
  expect(row.values).toMatchObject({ customKey: "keep", distance: 5 });
  const links = await database.db.select().from(activitySubrowTag)
    .where(eq(activitySubrowTag.subrowId, row.id));
  expect(links.map(x => x.tagId)).toEqual([tagId]);
});
```

Also test: a transaction inserts/updates activity, then fails child insertion and leaves the old full state intact (install a temporary rejecting DB trigger for a sentinel note); legacy rows survive migration untouched; tag FK cascade; direct reference to missing exercise/tag rejected; a plan referencing an exercise blocks deletion but allows archive; empty blocks is authoritative over legacy exercises; query filtering by block tag deduplicates a training matching both session and block.

- [ ] **Step 2: Run integration tests red.** `pnpm test:physical:integration` once the script is added. Expected: missing table/column/repository failures. Confirm Docker is available; if unavailable, finish independent unit/code work and report the unavailable integration gate explicitly rather than using production DB.

- [ ] **Step 3: Add migration and Drizzle schema.** Verify 0010 is still free first. Migration core:

```sql
ALTER TABLE physical_activities ADD COLUMN title text;
ALTER TABLE physical_activity_subrows ADD COLUMN details jsonb;
ALTER TABLE activity_tag_groups ADD COLUMN placement jsonb;
ALTER TABLE physical_workout_plans ADD COLUMN blocks jsonb;
CREATE TABLE physical_activity_subrow_tags (
  subrow_id uuid NOT NULL REFERENCES physical_activity_subrows(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES activity_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (subrow_id, tag_id)
);
CREATE INDEX physical_activity_subrow_tags_tag_idx ON physical_activity_subrow_tags(tag_id);
INSERT INTO physical_fields(scope,key,label,kind,required,sort_order) VALUES
  ('subrow','sprintDuration','Trajanje sprinta (s)','duration_sec',false,6),
  ('subrow','sprintRest','Pauza (s)','duration_sec',false,7)
ON CONFLICT(scope,key) DO NOTHING;
```

Null placement defaults to session/all in code. Nullable metadata enables legacy detection. Do not modify deployed SQL checksums or populate user labels by name guessing. Use typed JSONB `$type<BlockDetails>()`, `$type<PlanBlocks>()`, `$type<TagPlacement>()` and export the relation type.

- [ ] **Step 4: Implement transaction-backed repository and wire actions.** Validate IDs, actuals, tags and plan JSON before transaction; also validate referenced IDs within transaction to avoid stale selections. Preserve existing reference FKs for activity exercise rows. Plan JSON references require explicit existence checks and deletion guards; serialize plan writes and exercise deletion with the same transaction advisory lock to prevent check/delete races. Query active and archived references, allow existing archived references in edited records, but do not offer them as new catalog choices. Generic delete should produce a useful rejection for referenced exercise. Repository throws domain errors, action maps them to `{ ok:false, error, fieldErrors? }`; do not disclose DB connection messages.

For activity update: check row existence, write parent, replace child rows, get inserted IDs in order, then insert block tags in that transaction. Preserve original block `id` as an input-only historical reference when adapting existing rows; strip it from copied/new blocks and never reuse it as an inserted ID. If an unchanged legacy row has historical zero placeholders, missing exercise or one metric absent, verify its original ID belongs to this activity and compare stored actual values before permitting legacy round-trip validation. Do not trust client metadata to grant a legacy exception. A changed actual result must satisfy the new done rules. Include regression tests for untouched legacy zero/empty rows, changed invalid results and a foreign activity's block ID. On plan upgrade keep historical plan exercise rows, but reads/counts use blocks when non-null. Revalidate only after commit. Empty legacy payloads still work while new done blocks enforce stricter checks.

- [ ] **Step 5: Batch query data and confirm tests green.** Extend existing child query and tag query rather than issuing one query per block/activity. Keep session tagIds for editing distinct from union tagIds used in list filtering. `getExercises(includeIds)` supports historical rendering. Run `pnpm test:physical:integration`, `pnpm exec vitest run lib/physical lib/validation/physical.test.ts` and `pnpm typecheck`; commit this task's explicit paths only.

**Deliverable:** New and historical data save/load correctly with transactional integrity and an additive migration verified only in isolated PostgreSQL.

## Task 3: Configurable selection and group placement

**Files:** Modify `app/(physical)/_actions/tagGroups.ts`, `_components/TagGroupEditor.tsx`, `configuration/page.tsx`; create `_components/TagSelection.tsx`; extend `lib/physical/tagSelection.test.ts`.

**Interfaces:** `updateTagGroupPlacement({id, placement}): Promise<ActionResult>` validates placement using domain enums; `TagSelection({ groups, tags, selectedIds, context, onChange })` consumes GroupConfig-compatible DB groups and emits complete selectedIds. Available labels are passed as DB group/tag objects; placement logic is always ID/config based.

- [ ] **Step 1: Pin renamed and moved group behavior in a failing test.**

```ts
it("keeps a historical selection at its old place after configuration moves", () => {
  const groups: GroupConfig[] = [{
    id: "group", placement: { scope: "block", modes: [], kinds: ["split"] },
  }];
  const tags = [{ id: "tempo", groupId: "group" }];
  expect(visibleGroups(groups, tags, ["tempo"], { scope: "session", mode: "gym" }))
    .toEqual(groups);
  expect(visibleGroups(groups, tags, [], { scope: "session", mode: "gym" }))
    .toEqual([]);
});
```

Also assert null placement is session/all; explicitly constrained modes appear for mixed when configured for mixed; a group's name cannot enter the filtering predicate; selecting a new tag replaces the other selection of the same group while preserving other groups.

- [ ] **Step 2: Run tests red then implement placement controls and visibility.** `pnpm exec vitest run lib/physical/tagSelection.test.ts`. Configuration offers Ceo trening/Deo treninga, relevant mode/kind toggles and explicitly explains empty restrictions = all. Save through server action with validated UUID and revalidation. User-selected old tags remain editable in context even if config moved; a group not normally visible is shown only when it has a retained selection.

```tsx
<fieldset>
  <legend>{group.name}</legend>
  {groupTags.length <= 6 ? groupTags.map(tag => (
    <button key={tag.id} type="button" aria-pressed={selectedIds.includes(tag.id)}
      onClick={() => chooseTag(group.id, tag.id)}>{tag.name}</button>
  )) : <SearchableTagChoice group={group} tags={groupTags} />}
</fieldset>
```

`chooseTag` and `SearchableTagChoice` are private helpers in TagSelection.tsx, using existing Popover/Input controls and filtered list options; include an Izbriši izbor action. Make selected states visible in both themes and supply proper radio/listbox keyboard behavior rather than click-only interactions.

- [ ] **Step 3: Verify configuration manually and tests green.** Create/rename group and add option in test DB, configure it for running blocks, save, reload and confirm new activity sees it; confirm historical selection still renders. Run targeted tag tests and typecheck; commit only this task's paths.

**Deliverable:** Configurable description without hardcoded Region/Pace-name behavior.

## Task 4: Adaptive activity editor and mixed workouts

**Files:** Create components in `app/(physical)/_components/activity/`: `ActivityForm.tsx`, `BlockEditor.tsx`, `BlockCard.tsx`, `RunFields.tsx`, `SprintFields.tsx`, `ExerciseFields.tsx`, `NumberInput.tsx`, `DurationFields.tsx`; modify `SetArrayInput.tsx`, `activities/new/page.tsx`, `activities/[id]/page.tsx`; replace old form usages and remove `DynamicActivityForm.tsx` once none remain. Create `lib/physical/input.ts`, `input.test.ts`.

**Interfaces:** Shared editor receives `blocks: TrainingBlock[]`, `onChange`, field definitions, exercise catalog, tag groups/tags and `mode: "actual" | "template"`. Template mode writes targets and structural metadata, actual mode writes values/status. `ActivityForm` receives initial ActivityDraft, catalog/config and optional source data (Task 5); uses existing createActivity/updateActivity actions with `toActivityWrite`.

```ts
export function parseDistance(text: string): number | null;
export function parseDurationParts(hours: string, minutes: string, seconds: string): number | null;
```

An empty input means absence; invalid text remains visible with error, never silently becomes a previous valid value or zero. Store raw numeric strings in the input component and block form submission while invalid, so malformed intermediate text cannot submit a stale value. Restore raw display from parsed values when source changes, keyed by rowKey.

- [ ] **Step 1: Add failing input tests.**

```ts
it("accepts Serbian decimal distance and explicit time parts", () => {
  expect(parseDistance("5,25")).toBe(5.25);
  expect(parseDistance("5.25")).toBe(5.25);
  expect(parseDistance("5,2,5")).toBeNull();
  expect(parseDurationParts("", "31", "12")).toBe(1872);
  expect(parseDurationParts("", "31", "99")).toBeNull();
});
```

Run `pnpm exec vitest run lib/physical/input.test.ts` red. Implement strict full-string finite-number parsing, positive distances, integer time fields, normalized seconds/minutes (0–59), hours nonnegative. Empty hours defaults zero; if all fields empty, duration is absent. All error states render at the field and reach the parent invalid-state check.

- [ ] **Step 2: Build small field/card components.** RunFields edits distance/duration and shows derived pace. SprintFields edits sprintDistance, sprintDuration, sprintReps and sprintRest. ExerciseFields searches existing exercise catalog and embeds SetArrayInput; allow reps/time switch, optional weight and explicit labels for bodyweight/warmup/per-side. Timed sets clear reps, rep sets clear duration when switching. Weight blank stays absent; bodyweight additional weight stays supported. Existing archived referenced exercise is a retained option, not offered globally.

```tsx
<BlockCard key={block.rowKey} block={block} onChange={updateBlock}>
  {block.kind === "split" && <RunFields block={block} onChange={updateBlock} />}
  {block.kind === "exercise" && <ExerciseFields block={block} onChange={updateBlock} />}
  {block.kind === "sprint" && <SprintFields block={block} onChange={updateBlock} />}
</BlockCard>
```

BlockEditor owns private updateBlock/remove/move/duplicate handlers calling domain helpers. BlockCard owns local expanded state and readable controls with aria-labels. A changed actual value marks done; deleting all results returns pending unless explicitly skipped. Skipped retains values but excludes them from summary until marked done again. Label, note, optional and targets are expandable metadata. Preserve unknown custom fields: render configured extra fields using reusable field input extracted from the old form; display unconfigured stored keys in retained details without deleting them.

- [ ] **Step 3: Assemble ActivityForm and page loading.** Native form submission supports Enter and client validation; startTransition calls existing server actions, disables repeated submission while pending, shows fieldErrors without resetting state, redirects only on success. Today uses local date helper, never UTC ISO truncation. Three starting cards set the first block/default mode only when empty; populated form card changes do not remove content. Region/session tags precede ordered blocks, block tags appear in their cards. A destructive kind change shows confirmation or offers adding a new block instead. Notes/Strava and top custom fields use expandable details. Actual summary uses summarizeActivity; incomplete warnings remain visible.

```tsx
<form onSubmit={handleSubmit} className="space-y-6 pb-24">
  <BlockEditor blocks={draft.blocks} onChange={setBlocks} mode="actual" />
  {error && <p role="alert">{error}</p>}
  <div className="sticky bottom-0 bg-background py-3">
    <Button type="submit" disabled={pending || hasInvalidInputs}>Sačuvaj aktivnost</Button>
  </div>
</form>
```

The snippet omits existing catalog/metadata props for brevity; define the full shared BlockEditor props in the component before calling it. `hasInvalidInputs` aggregates input validity by rowKey and field name, removing entries when blocks are deleted. Error inside collapsed block expands the block and focuses first invalid field.

- [ ] **Step 4: Verify real workflows in an isolated/test app.** Ordinary run 5.2 km + 31:12, 7-minute warmup → tempo → 7-minute cooldown → squat, easy → 4 × 10 s sprint + 120 s rest → easy, broad jump 3×3 without weight, timed recovery 45 s. Save/reload and compare exact values, tags and order. Force an action failure and confirm all raw inputs remain; move a partially edited time block and verify its values follow it; check phone width 375 px and keyboard actions. Run input/domain tests and typecheck. Commit explicit task files.

**Deliverable:** Working new activity creation/editing for mixed workouts with existing options preserved; source shortcuts arrive in the next task.

## Task 5: Mixed templates, source shortcuts and safe replacement

**Files:** Modify `_components/WorkoutPlanForm.tsx`, `_components/WorkoutPlanList.tsx`, `plans/workouts/new/page.tsx`, `plans/workouts/[id]/page.tsx`, `plans/splits/[id]/page.tsx`, `lib/queries/physical.ts`, `activity/ActivityForm.tsx`; create `activity/SourcePicker.tsx`, `lib/physical/planAdapter.ts`, `planAdapter.test.ts`; extend `drafts.test.ts` and repository/action tests as needed.

**Interfaces:**

```ts
export type LegacyPlanExercise = {
  exerciseId: string; setCount: number; sortOrder: number; linkNext: boolean;
};
export function adaptLegacyPlan(rows: LegacyPlanExercise[]): PlanBlocks;
export type SourceOption = {
  id: string; kind: "activity" | "plan" | "splitDay";
  label: string; draft: ActivityDraft; previous?: ActivityDraft;
  conflicts: { groupId: string; tagIds: string[] }[];
};
```

SourcePicker receives SourceOption[] and onApply(ActivityDraft), displays a preview, resolves conflicting same-group selections, and replaces the form only when the user confirms replacement of a dirty draft. At first support a bounded recent-activity list (20) plus active plans/split days. Query `getRecordingSources(): Promise<SourceOption[]>` batches source metadata/children, uses today at apply time rather than request-time midnight assumptions, and supplies references separately from actual new results. If query needs smaller client payloads, source options hold ID and action fetches chosen source before preview; do not change the shared draft/preview semantics.

- [ ] **Step 1: Add red adapter and repeat tests with actual assertions.**

```ts
it("keeps planned sets and supersets separate from results", () => {
  const plan = adaptLegacyPlan([
    { exerciseId: "bench", setCount: 3, sortOrder: 0, linkNext: true },
    { exerciseId: "pull", setCount: 3, sortOrder: 1, linkNext: false },
  ]);
  expect(plan.items[0].details.targets.setCount).toEqual({ min: 3, max: 3 });
  expect(plan.items[0].details.linkNext).toBe(true);
  expect(plan.items[0].values).toEqual({});
});
it("repeats structure with today's date and blank outcomes", () => {
  const b = newBlock("split");
  b.values = { distance: 8, duration: 2400 }; b.details.status = "done";
  const source: ActivityDraft = {
    id: "old", title: "Tempo", performedAt: new Date("2026-10-01T10:00:00Z"),
    values: {}, comment: "Stari komentar", stravaUrl: "https://www.strava.com/activities/1",
    tagIds: [], blocks: [b],
  };
  const today = new Date("2026-10-08T10:00:00Z");
  const next = repeatActivity(source, today);
  expect(next.id).toBeUndefined();
  expect(next.performedAt).toEqual(today);
  expect(next.blocks[0].values).toEqual({});
  expect(next.blocks[0].details.status).toBe("pending");
  expect(next.stravaUrl).toBeNull();
  expect(source.blocks[0].values.distance).toBe(8);
});
```

Add label-only unchosen plan exercise, optional/skipped result handling, explicit resultsAsTargets true/false, no legacy fallback when blocks.items is empty, multiple plans in split day order and conflicting session tag resolution. Run `pnpm exec vitest run lib/physical/planAdapter.test.ts lib/physical/drafts.test.ts` red for new behaviors.

- [ ] **Step 2: Implement plan adapter and template mode.** Old plans adapt set counts into target ranges and preserve linkNext. New WorkoutPlanForm embeds shared BlockEditor in template mode with no actual-result inputs/status. Allow labels without exerciseId, numeric ranges for reps/setCount/distance/time/rest, optional flags and block tags. Plan is saved using the Task 2 schema and repository. Counts in plan list count applicable block types, not obsolete exercises rows. Existing split-day plan references remain valid; add a log-from-day link preserving source ID.

```tsx
<BlockEditor blocks={templateDraft.blocks} onChange={setTemplateBlocks} mode="template" />
<Button type="submit">Sačuvaj šablon</Button>
```

Convert between PlanBlock and TrainingBlock at the form boundary: fresh rowKey and pending status for editor, strip rowKey/status on save, verify actual standard keys are absent. Save-as-template dialog previews structure and offers explicit results-as-targets checkbox; no direct automatic write. No automatic predefined recovery/upper template seed.

- [ ] **Step 3: Wire source loading, previews and replacement guard.** SourcePicker shows results of previous training with label Prethodni rezultat, not values in new inputs. Cancel preserves the current draft, including invalid raw text. Confirm replacement remounts the editor with new identity so local raw fields cannot bleed from the old draft. No network mutation until Save. Use source query IDs for links from detail/plan pages and resolve absent/archived sources with a clear message rather than loading empty template silently.

- [ ] **Step 4: Verify sources, templates and conflict resolution.** Use Upper 2 with three supersets, Tempo + Squat, Petak A time-based sprint and Petak B jumps templates in test DB. Enter day targets while leaving unknown upper exercise unselected. Load each into new activity, verify actuals empty, change results without changing source, skip optional work, save and repeat. Choose another source over a populated form, cancel and compare raw inputs; then confirm replacement. Split-day conflicting tags require an explicit selection. Run domain/integration tests and typecheck; commit explicit task paths.

**Deliverable:** Shared mixed templates and safe shortcuts that never claim prior/planned work was done today.

## Task 6: Training overview, list summaries and final verification

**Files:** Create `app/(physical)/_components/ActivityOverview.tsx`; modify `_components/ActivityList.tsx`, `activities/[id]/page.tsx`; create `activities/[id]/edit/page.tsx`; finalize new/source page links and relevant `_revalidate.ts` paths. Add tests to activitySummary/recording suites where rendering exposes missing rules.

**Interfaces:** `/activities/[id]` is the read-only overview; `/activities/[id]/edit` hosts ActivityForm. Existing activity IDs and links remain valid. ActivityOverview receives ActivityDetail + referenced catalog/tag definitions, uses Task 1 adapters/summary, and exposes Izmeni, Ponovi trening and Sačuvaj kao šablon. New/source route reads promised searchParams as documented by installed Next.js, validates source IDs before lookup.

- [ ] **Step 1: Pin summary and historical-read regressions before rendering.**

```ts
it("excludes planned and skipped work and computes weighted running pace", () => {
  const a = newBlock("split"), b = newBlock("split"), skipped = newBlock("split");
  a.values = { distance: 2, duration: 600 }; a.details.status = "done";
  b.values = { distance: 4, duration: 1440 }; b.details.status = "done";
  skipped.values = { distance: 10, duration: 3600 }; skipped.details.status = "skipped";
  expect(summarizeActivity([a, b, skipped])).toMatchObject({
    distanceKm: 6, activeRunSeconds: 2040, runPaceSeconds: 340,
  });
});
```

Integration query tests assert block/session tag union is deduplicated while editing sees only true session tagIds; archived referenced exercise label is retrieved; overview adapter preserves old manual pace when it cannot compute a new one. Run relevant tests red if new requirements are not already covered.

- [ ] **Step 2: Implement readable overview and list.** Overview renders blocks in order with type-specific result summaries, target/reference labels, tags, notes, skipped/pending badges and grouped supersets. List shows title fallback based on content (Trčanje, Teretana, Kombinovani trening), date, tags, known distance and completed exercise count. Use text such as Unesena distanca when distanceComplete=false, Aktivno vreme trčanja for recorded time, and Tempo trčanja excluding sprint groups. Do not label missing time/distances as zero outcomes. Manual legacy pace is Zabeleženi tempo. Add source links without immediately saving.

```tsx
<p>{summary.distanceComplete ? "Distanca" : "Unesena distanca"}: {formatKm(summary.distanceKm)}</p>
<p>Aktivno vreme trčanja: {secondsToHhmmss(summary.activeRunSeconds)}</p>
```

`formatKm` is a private `Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 })` formatter in ActivityOverview; use shared export if list also needs it. Show metrics only when an applicable recorded value exists, rather than 0 km for a gym workout. Keep edit/source links and source-apply errors accessible.

- [ ] **Step 3: Run the full spec acceptance checklist through browser.** Use isolated/test data at desktop width and 375 px; light/dark; keyboard-only start, choose, add, move, save. Verify all 10 scenarios in spec, including timed recovery, sprint-only unknown distance, mixed tempo/skokovi, duplicate versus repeat semantics, failed save, moved group, archived exercise, old custom JSON and manual pace. Record observed results in this plan's execution notes or final report; create screenshots only where useful for reviewing layout. Do not seed fake completed workouts into production.

- [ ] **Step 4: Run required final gates once.**

```sh
pnpm test
pnpm test:physical:integration
pnpm typecheck
pnpm exec eslint 'app/(physical)' lib/physical lib/validation/physical.ts lib/queries/physical.ts db/schema/physical.ts tests/physical
pnpm build
git diff --check
```

Run build with legitimate local build configuration; do not substitute fabricated secrets. If a gate fails, fix its cause and rerun affected checks. Inspect final migration and read/write paths for accidental data loss, stale plan fallbacks, extra DB queries and previous-results leakage. If integration environment is unavailable, state the unverified gate clearly and do not claim full acceptance.

- [ ] **Step 5: Review and finish.** Commit only reviewed remaining task files if using the project commit allowance. Report implemented behavior, passed checks, migration file, deployment/migration status and any concrete remaining limitations. Do not apply production migrations or deploy as part of this development plan without the user requesting that operational step.

**Deliverable:** Complete readable recording workflow verified against the user's high-level training plan, with migration ready for the deployment process.

## Spec coverage and self-review

| Spec requirement | Owning tasks |
|---|---|
| One activity, ordered mixed blocks, adaptive start | 1, 4 |
| Configurable region/session and run-type/block tags | 1, 2, 3 |
| Sprint distance/time/rest, timed recovery, optional weight | 1, 2, 4 |
| Supersets and stable identity after structure changes | 1, 4, 5 |
| Actual versus planned/skipped, incomplete totals | 1, 4, 6 |
| Legacy activities/JSON/manual pace/archived catalog | 1, 2, 4, 6 |
| Mixed templates, save-as-template, repeat, split-day plans | 1, 2, 5 |
| Dirty-source guard and failed-save retention | 4, 5 |
| Overview, list and label consistency | 6 |
| Mobile/keyboard/themes and acceptance scenarios | 3, 4, 6 |
| Migration and atomic reference integrity | 2 |

Review the plan against the approved spec before execution. Public signatures above are the shared contracts; private component handlers are local implementation details. Fixtures in examples are local to each test. The six tasks form one subsystem and must run sequentially because later tasks consume earlier interfaces; independent agent implementation without those interfaces is inappropriate.

## Execution handoff

Recommended: native execution in this session, task by task, because the same ordered-block contracts span forms, storage and templates. A fresh final reviewer should check the completed branch for preservation of historical data, planned-versus-actual semantics and migration safety. Subagent-driven execution is an available alternative with fresh implementer/reviewer contexts per task. The user reviews this plan and selects the execution method before application code changes.
