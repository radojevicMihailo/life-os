# Portfolio buckets + net-worth chart

Date: 2026-06-03
Scope: `app/finance/portfolio`, `app/finance/configuration`, finance schema.

## Goal

Make portfolio page show net-worth composition visually (pie chart per asset
group), keep the existing detailed per-account table, and introduce a configurable
"bucket" layer (Group → Bucket → Account) so users can summarise holdings at a
mid level (e.g. "Dinarski račun Raiffeisen", "Gotovina RSD", "IBKR",
"Trezor Safe 3").

## Data model

New entity **Bucket** between AssetGroup and Account.

### `finance_buckets`

| Column          | Type        | Notes                                       |
|-----------------|-------------|---------------------------------------------|
| id              | uuid pk     | default random                              |
| name            | text not null | unique                                    |
| asset_group_id  | uuid fk → finance_asset_groups (on delete set null) | nullable |
| sort_order      | integer not null default 0                  |
| created_at      | timestamptz not null default now()          |

Indexes:
- unique on `name`
- index on `asset_group_id`

### `finance_accounts` change

- Add `bucket_id uuid` references `finance_buckets(id) on delete set null`,
  nullable.
- Keep existing `asset_group_id` column. Source of truth for grouping stays
  AssetGroup; bucket is additional. Optional now, may become required later.

Migration: `db/migrations/0011_finance_buckets.sql`. Plain DDL, no backfill.

## Configuration page

Add new section between `AssetGroupEditor` and `AccountEditor` in
`app/finance/configuration/page.tsx`.

`BucketEditor` (new client component, pattern mirrors `AccountEditor`):
- List buckets with: name (inline rename) + group selector + remove.
- Add-row at top: name input + group select + add button.

Server actions in `app/finance/_actions/buckets.ts`:
- `addBucket({ name, assetGroupId, sortOrder })`
- `renameBucket({ id, name })`
- `setBucketGroup({ id, assetGroupId })`
- `removeBucket(id)`

Each wraps drizzle insert/update/delete and calls `_revalidate.ts` helper.

`AccountEditor`:
- Add Bucket select column on each row + add-row.
- Bucket options filtered by chosen account group (if group set).
- Selecting bucket also auto-sets account.asset_group_id to bucket's group
  when account group is empty (UX nicety; explicit user group still wins).
- New action `setAccountBucket({ id, bucketId })` in `_actions/accounts.ts`.

`lib/queries/finance.ts`: add `getBuckets()` returning rows with joined group
name; loaded in configuration page alongside existing queries.

Asset groups already managed by `AssetGroupEditor`; no change needed there.

## Portfolio page layout

```
+---------------------------+----------------------------+
|                           |  Net worth: € X            |
|                           +----------------------------+
|   Donut chart             |  Bucket        | EUR total |
|   (slice per group)       |  Banka-Raiff   | 1 234     |
|                           |  Gotovina RSD  | 56        |
|                           |  IBKR          | 7 890     |
|                           |  Bez buketa    | 12        |
+---------------------------+----------------------------+
| Per-account table (existing, unchanged, full width)    |
+--------------------------------------------------------+
```

Implementation:
- Top row: CSS grid `md:grid-cols-[1fr_320px]` (chart left, narrow right col).
- Chart: donut, slice per `assetGroup`. Slice tooltip shows group name, EUR, %.
  Groups with zero total omitted. Accounts with no group fall under "Bez grupe"
  slice.
- Right top: existing net-worth card.
- Right bottom: small bucket table, columns `Bucket | EUR total`. Sorted by
  EUR desc. Accounts with `bucket_id IS NULL` aggregate into "Bez buketa" row,
  shown last.
- Bottom: existing detailed account table, unchanged.

## Chart library

Install `recharts`. Render via shadcn-style wrapper (or directly) inside a
client component `PortfolioChart.tsx`. Server page passes `groupTotals` as
props. No interactivity beyond hover tooltip.

## Portfolio data layer

`lib/finance/portfolio.ts` `getPortfolio()` extended:

Return shape:
```ts
type Portfolio = {
  rows: PortfolioRow[];              // existing per-account rows
  netWorthEur: number;
  groupTotals: GroupTotal[];         // new
  bucketTotals: BucketTotal[];       // new
};

type GroupTotal = { groupId: string | null; name: string; eur: number };
type BucketTotal = { bucketId: string | null; name: string; eur: number };
```

Computation: after per-account EUR totals are calculated (existing logic),
reduce by `assetGroupId` and `bucketId` in memory. SQL extended only to also
select `a.bucket_id` and join `finance_buckets` for `bucket_name`.

Null group → "Bez grupe". Null bucket → "Bez buketa". Zero totals skipped from
chart but bucket "Bez buketa" row shown if any null-bucket accounts have
nonzero EUR.

## Error handling

- Bucket without group: allowed; bucket appears in table but not tied to a
  chart slice (its accounts roll up by their own group_id).
- Account whose bucket's group differs from account.asset_group_id: account is
  shown under its own `asset_group_id` in chart and under its `bucket_id` in
  bucket table. No reconciliation enforced.
- Delete bucket: `on delete set null` on accounts.bucket_id; no orphan errors.

## Testing

- Manual via dev server: create one bucket per group, assign two existing
  accounts, verify chart slices and bucket totals match.
- Unit (vitest) for `getPortfolio()` if a test harness exists for portfolio.ts
  (check `test/` directory; if absent, skip — no test infra change in this
  spec).

## Files touched

New:
- `db/migrations/0011_finance_buckets.sql`
- `app/finance/_actions/buckets.ts`
- `app/finance/_components/BucketEditor.tsx`
- `app/finance/_components/PortfolioChart.tsx`

Edited:
- `db/schema/finance.ts` (+ bucket table, + account.bucketId)
- `lib/queries/finance.ts` (+ getBuckets)
- `lib/finance/portfolio.ts` (+ aggregations, + bucket join)
- `app/finance/_actions/accounts.ts` (+ setAccountBucket)
- `app/finance/_components/AccountEditor.tsx` (+ bucket select)
- `app/finance/configuration/page.tsx` (+ bucket section)
- `app/finance/portfolio/page.tsx` (rewrite layout, mount chart)
- `package.json` (+ recharts)

## Out of scope

- Per-currency breakdown in bucket table.
- Drill-down / expand on bucket row.
- Required-bucket migration of existing accounts.
- Historical chart (only current snapshot).
