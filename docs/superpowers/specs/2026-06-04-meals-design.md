# Meal Diary — Design

Date: 2026-06-04
Status: Approved (brainstorm)

## Purpose

Calorie/macro tracking section. Log meals throughout the day, sum kcal + protein/carbs/fat against configurable daily targets, browse history via day view and monthly calendar. Reuse common meals via templates.

## Scope (phase 1)

In:

- Personal food library (CRUD).
- Free-named meals (e.g. "morning coffee") grouping multiple food items, each with grams.
- OpenFoodFacts (OFF) search → import food to library (read-only, no barcode scan).
- Day-centric main view with totals + target progress.
- Monthly calendar grid (kcal-per-day, color vs target).
- Meal templates (save full meal; re-add to a day).
- Configurable daily targets in settings (kcal, protein_g, carbs_g, fat_g). Each nullable; null = not tracked.

Out (later phases):

- Barcode scanning.
- Per-day target overrides.
- Weekly/period reports beyond the calendar.
- Recipe builder (food made of other foods).
- Water/hydration tracking.
- Auto-suggestion of recent foods (templates cover the reuse case for now).

## Architecture

Mirror existing `habits/` and `(physical)/` section layout.

```
app/meals/
  page.tsx                     # day view, default = today
  [date]/page.tsx              # day view for arbitrary date (YYYY-MM-DD)
  calendar/page.tsx            # month grid
  library/page.tsx             # food library list
  library/new/page.tsx
  library/[id]/page.tsx        # edit food
  templates/page.tsx           # meal templates list
  templates/new/page.tsx
  templates/[id]/page.tsx
  _actions/
    foods.ts                   # CRUD food_items
    meals.ts                   # CRUD meals + meal_items
    templates.ts               # CRUD templates + items, "apply to day"
    search.ts                  # OFF search + import
    _revalidate.ts
  _components/
    DayView.tsx
    MealCard.tsx               # one meal: items list, totals, edit/delete
    AddMealDialog.tsx
    EditMealDialog.tsx
    FoodPicker.tsx             # search library + OFF, grams input
    TargetsBar.tsx             # kcal + macros progress
    CalendarGrid.tsx
db/schema/meals.ts
db/migrations/0014_meals.sql
lib/meals/
  totals.ts                    # sum kcal/macros for items / meals / day
  off.ts                       # OpenFoodFacts client + normalize
lib/validation/meals.ts        # zod schemas for actions
```

Daily targets piggyback on existing `app_settings` (extend with four nullable integer columns), so settings page exposes them alongside other prefs.

### Boundaries

- `lib/meals/totals.ts` — pure functions over snapshot rows; testable without DB.
- `lib/meals/off.ts` — thin HTTP client + response normalizer; isolated for mocking.
- `_actions/*` — server actions, the only place that touches the DB; revalidate via `_revalidate.ts`.
- `_components/*` — presentational + light state; no DB calls, no fetch.

## Data model

All tables under `db/schema/meals.ts`. Drizzle conventions match `habits.ts`.

### `food_items` — personal library

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | |
| brand | text | nullable |
| kcal_per_100g | numeric(8,2) not null | |
| protein_g_per_100g | numeric(7,2) not null default 0 | |
| carbs_g_per_100g | numeric(7,2) not null default 0 | |
| fat_g_per_100g | numeric(7,2) not null default 0 | |
| source | enum('manual','off') not null default 'manual' | |
| off_id | text | OFF code if source='off' |
| archived_at | timestamptz | soft-delete |
| created_at / updated_at | timestamptz | |

Index: `(archived_at)`, `(name)` for search; unique `(off_id)` partial where `off_id is not null`.

### `meals`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| date | date not null | day the meal belongs to |
| name | text not null | free-form (e.g. "lunch", "post-gym shake") |
| eaten_at | timestamptz | optional time within day |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

Index: `(date)`.

### `meal_items`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| meal_id | uuid not null, fk → meals(id) on delete cascade | |
| food_id | uuid, fk → food_items(id) on delete set null | nullable after food deletion |
| food_name_snapshot | text not null | rendered even if food deleted |
| kcal_per_100g_snapshot | numeric(8,2) not null | |
| protein_snapshot | numeric(7,2) not null | |
| carbs_snapshot | numeric(7,2) not null | |
| fat_snapshot | numeric(7,2) not null | |
| grams | numeric(8,2) not null | |
| sort_order | integer not null default 0 | |

Snapshots are copied at insert time. Editing a `food_items` row does NOT retro-update past meals. Keeps historical totals stable and is simpler than a versioning scheme.

### `meal_templates` + `meal_template_items`

Mirror `meals` + `meal_items` minus `date`/`eaten_at`. Template items also carry snapshots so that templates can be applied even after a referenced food is edited; applying a template uses the template's snapshots, not the food's current values.

```
meal_templates(id, name, created_at, updated_at)
meal_template_items(
  id, template_id (cascade), food_id (set null),
  food_name_snapshot, kcal_per_100g_snapshot,
  protein_snapshot, carbs_snapshot, fat_snapshot,
  grams, sort_order
)
```

### Targets in `app_settings`

Add nullable integer columns:

- `meal_daily_kcal_target`
- `meal_daily_protein_g_target`
- `meal_daily_carbs_g_target`
- `meal_daily_fat_g_target`

`null` ⇒ target not tracked; the corresponding progress bar / calendar coloring is suppressed.

## Computation

`lib/meals/totals.ts`:

- `itemTotals(item)` → `{ kcal, protein, carbs, fat }`, each = `snapshot * grams / 100`.
- `mealTotals(items)` → sum of `itemTotals`.
- `dayTotals(meals)` → sum across all meals.
- Pure, take rows as input, no DB. Unit-tested.

Rounding: keep two decimals internally, display rounded to integer kcal and 1 decimal grams.

## OpenFoodFacts integration

`lib/meals/off.ts`:

- `searchOff(query: string, limit = 10)`: `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=…&search_simple=1&action=process&json=1&page_size=…`.
- Normalize each product to `{ off_id, name, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g }`. Pull from `nutriments.energy-kcal_100g` (fallback `energy-kj_100g / 4.184`), `proteins_100g`, `carbohydrates_100g`, `fat_100g`. Skip rows missing kcal.
- No API key, no auth; set a `User-Agent: life-os/1.0`. Wrap in try/catch; action returns `{ results: [...] }` or `{ error: '...' }`.
- Import path: server action `importOffFood(offId)` re-fetches that product (`/api/v2/product/<code>.json`) for authoritative values, inserts into `food_items` with `source='off'`. If already imported (unique on `off_id`), return existing row.

## Flows

### Log a meal (day view)

1. User on `/meals` (today) or `/meals/2026-06-04`.
2. Clicks "Add meal" → `AddMealDialog`.
3. Inputs name + optional time.
4. `FoodPicker` rows: per row, search input → debounced library search → list. If no library match, "Search OpenFoodFacts" button → OFF results → pick one → imports into library, appears as new row, focused for grams input.
5. Grams input per row. Live totals at the bottom of the dialog.
6. Save → server action inserts `meals` + `meal_items` (with snapshots from `food_items`) → revalidate day view.

### Edit / delete

- Edit meal: same dialog, prefilled. Editing rewrites items (delete + reinsert) — keeps snapshot logic simple.
- Delete meal: cascade removes items.

### Apply template

- `/meals/templates` lists templates with their totals.
- Each row has "Add to today" / "Add to date…" menu.
- Action creates a new `meals` row (default name = template name, `eaten_at = now()` for today / `null` for chosen date) and copies template items into `meal_items` using the template's snapshots.

### Calendar

- `/meals/calendar` shows current month grid (URL `?month=YYYY-MM` for navigation).
- Server loads daily totals for the month in one query (`group by date`).
- Cell shows kcal sum; background color reflects vs `meal_daily_kcal_target` if set (e.g. green = within ±10%, amber = under/over by up to 25%, red beyond). If no target, neutral.
- Click cell → `/meals/<date>`.

### Settings

- Extend existing settings page with a "Meals" section: four optional integer inputs.
- Saved via existing settings server action (extend zod schema).

## URL + nav

- Sidebar: existing "Meals" item now routes to `/meals` (was placeholder).
- Sub-tabs inside meals section: Day, Calendar, Library, Templates.

## Error handling

- All actions wrap inserts in a transaction (meal + items together).
- OFF API errors surface as inline error in `FoodPicker`; library search still works.
- Validation via zod (`lib/validation/meals.ts`): meal name non-empty, grams > 0, per-100g values ≥ 0.
- Deleting a food in the library is a soft-delete (`archived_at`); item rows keep snapshots and continue to render; library views filter out archived by default.

## Testing

Unit (vitest):

- `lib/meals/totals.ts` — itemTotals, mealTotals, dayTotals; rounding.
- `lib/meals/off.ts` — normalizer against fixture JSON (kJ-only fallback, missing kcal skip, brand extraction).
- `lib/validation/meals.ts` — schema accepts/rejects edge inputs.

No e2e in phase 1; manual verification via the running app.

## Open assumptions

- Single-user app (matches the rest of life-os) — no user_id columns.
- Server actions, not a REST API, for mutations (matches existing sections).
- `numeric` columns map to strings in drizzle; totals lib coerces with `Number(...)` at the edge.
