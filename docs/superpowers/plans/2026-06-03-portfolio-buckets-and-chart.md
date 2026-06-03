# Portfolio Buckets + Net-Worth Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable Bucket layer between AssetGroup and Account, a donut chart of net worth by group, and a compact bucket-totals table on the portfolio page — without removing the existing per-account table.

**Architecture:** New `finance_buckets` table + nullable `bucket_id` on `finance_accounts`. `getPortfolio()` returns extra `groupTotals` and `bucketTotals` arrays computed in-memory from the existing per-account EUR totals. New `BucketEditor` in the finance configuration page; `AccountEditor` extended with a bucket selector. Portfolio page rewritten into a two-column top row (chart left, net worth card + bucket table right) above the existing per-account table.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM, Postgres, zod, sonner, shadcn/ui, recharts, vitest.

Spec: `docs/2026-06-03-portfolio-buckets-and-chart-design.md`.

---

## File Structure

New files:
- `db/migrations/0011_finance_buckets.sql`
- `app/finance/_actions/buckets.ts`
- `app/finance/_components/BucketEditor.tsx`
- `app/finance/_components/PortfolioChart.tsx`
- `lib/finance/aggregations.ts` — pure helpers turning per-account rows into group/bucket totals (unit-testable).
- `lib/finance/aggregations.test.ts` — vitest tests for the helpers.

Modified files:
- `db/schema/finance.ts` — add `bucket` table; add `bucketId` column to `account`.
- `lib/queries/finance.ts` — add `getBuckets()`.
- `lib/finance/portfolio.ts` — extend SQL to join `finance_buckets`, return `groupTotals` + `bucketTotals`.
- `app/finance/_actions/accounts.ts` — accept `bucketId` in update + add schemas.
- `app/finance/_components/AccountEditor.tsx` — add bucket select column.
- `app/finance/configuration/page.tsx` — load buckets, mount `BucketEditor`.
- `app/finance/portfolio/page.tsx` — new two-column layout, mount chart + bucket table.
- `package.json` — add `recharts` dependency.

---

## Task 1: Drizzle schema + migration for buckets and account.bucket_id

**Files:**
- Modify: `db/schema/finance.ts`
- Create: `db/migrations/0011_finance_buckets.sql`

- [ ] **Step 1: Add `bucket` table + `bucketId` column to schema**

In `db/schema/finance.ts`, after the `assetGroup` table definition and BEFORE the `account` table definition, insert:

```ts
export const bucket = pgTable(
  "finance_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    assetGroupId: uuid("asset_group_id").references(() => assetGroup.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("finance_bucket_name_idx").on(t.name),
    index("finance_bucket_group_idx").on(t.assetGroupId),
  ],
);
```

In the same file, inside the `account` table columns object add (between `assetGroupId` and `currencyId`):

```ts
    bucketId: uuid("bucket_id").references(() => bucket.id, {
      onDelete: "set null",
    }),
```

In the `account` table index list, append:

```ts
    index("finance_account_bucket_idx").on(t.bucketId),
```

At bottom of file, add to the type exports:

```ts
export type Bucket = typeof bucket.$inferSelect;
```

- [ ] **Step 2: Write SQL migration**

Create `db/migrations/0011_finance_buckets.sql`:

```sql
CREATE TABLE "finance_buckets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "asset_group_id" uuid REFERENCES "finance_asset_groups"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_bucket_name_idx" ON "finance_buckets" ("name");
--> statement-breakpoint
CREATE INDEX "finance_bucket_group_idx" ON "finance_buckets" ("asset_group_id");
--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "bucket_id" uuid REFERENCES "finance_buckets"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "finance_account_bucket_idx" ON "finance_accounts" ("bucket_id");
```

- [ ] **Step 3: Apply migration**

Run: `pnpm tsx scripts/db-apply.mjs`
Expected: prints `Applied 0011_finance_buckets.sql` (or equivalent success line). No errors.

If `scripts/db-apply.mjs` is a `.mjs` file, run with `node scripts/db-apply.mjs` instead.

- [ ] **Step 4: Verify in Postgres**

Run:
```bash
docker compose exec -T postgres psql -U postgres -d lifeos -c "\d finance_buckets" -c "\d finance_accounts"
```
Expected: `finance_buckets` table exists; `finance_accounts` has `bucket_id` column with FK to `finance_buckets`.

- [ ] **Step 5: Commit**

```bash
git add db/schema/finance.ts db/migrations/0011_finance_buckets.sql
git commit -m "feat(finance): add buckets table + account.bucket_id"
```

---

## Task 2: getBuckets query

**Files:**
- Modify: `lib/queries/finance.ts`

- [ ] **Step 1: Add bucket import + query**

In `lib/queries/finance.ts`, extend the schema import block to include `bucket` and `Bucket`:

```ts
import {
  account,
  assetGroup,
  bucket,
  currency,
  transaction,
  transactionCategory,
  transactionType,
  type Account,
  type AssetGroup,
  type Bucket,
  type Currency,
  type Transaction,
  type TransactionCategory,
  type TransactionTypeRow,
} from "@/db/schema/finance";
```

Append at the bottom of the file:

```ts
export async function getBuckets(): Promise<Bucket[]> {
  return db.select().from(bucket).orderBy(asc(bucket.sortOrder), asc(bucket.name));
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/finance.ts
git commit -m "feat(finance): getBuckets query"
```

---

## Task 3: Bucket server actions

**Files:**
- Create: `app/finance/_actions/buckets.ts`

- [ ] **Step 1: Write actions file**

Create `app/finance/_actions/buckets.ts`:

```ts
"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bucket } from "@/db/schema/finance";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  name: z.string().trim().min(1).max(100),
  assetGroupId: z.uuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addBucket(
  input: z.input<typeof addSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(bucket)
      .values({
        name: parsed.data.name,
        assetGroupId: parsed.data.assetGroupId ?? null,
        sortOrder: parsed.data.sortOrder,
      })
      .returning({ id: bucket.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Bucket name must be unique");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  assetGroupId: z.uuid().nullable().optional(),
});

export async function updateBucket(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.assetGroupId !== undefined) patch.assetGroupId = parsed.data.assetGroupId;
  try {
    await db.update(bucket).set(patch).where(eq(bucket.id, parsed.data.id));
    revalidateFinanceRoutes();
    return { ok: true, data: undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Bucket name must be unique");
    throw e;
  }
}

export async function removeBucket(id: string): Promise<ActionResult> {
  await db.delete(bucket).where(eq(bucket.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/finance/_actions/buckets.ts
git commit -m "feat(finance): server actions for buckets"
```

---

## Task 4: BucketEditor client component

**Files:**
- Create: `app/finance/_components/BucketEditor.tsx`

- [ ] **Step 1: Write component**

Create `app/finance/_components/BucketEditor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addBucket, removeBucket, updateBucket } from "../_actions/buckets";
import type { AssetGroup, Bucket } from "@/db/schema/finance";

const NONE = "__none__";

export function BucketEditor({
  buckets,
  groups,
}: {
  buckets: Bucket[];
  groups: AssetGroup[];
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(NONE);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await addBucket({
        name,
        assetGroupId: groupId === NONE ? null : groupId,
        sortOrder: buckets.length,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setName("");
    });
  }

  function rename(b: Bucket, next: string) {
    if (next === b.name) return;
    startTransition(async () => {
      const r = await updateBucket({ id: b.id, name: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setGroup(b: Bucket, value: string) {
    const v = value === NONE ? null : value;
    if (v === b.assetGroupId) return;
    startTransition(async () => {
      const r = await updateBucket({ id: b.id, assetGroupId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(b: Bucket) {
    if (!confirm(`Remove bucket "${b.name}"?`)) return;
    startTransition(async () => {
      const r = await removeBucket(b.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">Bukete</h3>
        <p className="text-xs text-muted-foreground">
          Srednji nivo grupisanja računa (npr. Dinarski Raiffeisen, IBKR, Trezor Safe 3).
        </p>
      </div>

      <ul className="space-y-2">
        {buckets.map((b) => (
          <li key={b.id} className="grid grid-cols-12 gap-2 items-center">
            <Input
              defaultValue={b.name}
              onBlur={(e) => rename(b, e.target.value.trim())}
              className="col-span-7"
            />
            <div className="col-span-4">
              <Select value={b.assetGroupId ?? NONE} onValueChange={(v) => setGroup(b, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Grupa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(b)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New bucket"
          className="col-span-7"
        />
        <div className="col-span-4">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Grupa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/BucketEditor.tsx
git commit -m "feat(finance): BucketEditor client component"
```

---

## Task 5: Mount BucketEditor in configuration page

**Files:**
- Modify: `app/finance/configuration/page.tsx`

- [ ] **Step 1: Wire BucketEditor into the page**

In `app/finance/configuration/page.tsx`:

1. Add to imports: `getBuckets` from `@/lib/queries/finance` and `BucketEditor` from `../_components/BucketEditor`.
2. Add `getBuckets()` call to the `Promise.all`.
3. Insert a new section between the group+currency section and the AccountEditor section.

Resulting file:

```tsx
import { Separator } from "@/components/ui/separator";
import {
  getAccounts,
  getAssetGroups,
  getBuckets,
  getCategories,
  getCurrencies,
  getTransactionTypes,
} from "@/lib/queries/finance";
import { CurrencyEditor } from "../_components/CurrencyEditor";
import { AssetGroupEditor } from "../_components/AssetGroupEditor";
import { BucketEditor } from "../_components/BucketEditor";
import { AccountEditor } from "../_components/AccountEditor";
import { CategoryEditor } from "../_components/CategoryEditor";
import { TransactionTypeEditor } from "../_components/TransactionTypeEditor";

export const dynamic = "force-dynamic";

export default async function FinanceConfigurationPage() {
  const [currencies, groups, buckets, accounts, categories, types] = await Promise.all([
    getCurrencies(),
    getAssetGroups(),
    getBuckets(),
    getAccounts(),
    getCategories(),
    getTransactionTypes(),
  ]);

  const byKind = {
    income: categories.filter((c) => c.kind === "income"),
    expense: categories.filter((c) => c.kind === "expense"),
    investment: categories.filter((c) => c.kind === "investment"),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Finance configuration</h1>
        <p className="text-sm text-muted-foreground">
          Tipovi transakcija, kategorije, računi, valute, grupe i bukete.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tip transakcije</h2>
        <TransactionTypeEditor types={types} />
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CurrencyEditor currencies={currencies} />
        <AssetGroupEditor groups={groups} />
      </section>

      <Separator />

      <section>
        <BucketEditor buckets={buckets} groups={groups} />
      </section>

      <Separator />

      <section>
        <AccountEditor accounts={accounts} groups={groups} buckets={buckets} currencies={currencies} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Kategorije</h2>
        <CategoryEditor
          kind="income"
          title="Kategorije za Prihod"
          categories={byKind.income}
        />
        <CategoryEditor
          kind="expense"
          title="Kategorije za Trošak"
          categories={byKind.expense}
        />
        <CategoryEditor
          kind="investment"
          title="Kategorije za Investicije"
          categories={byKind.investment}
        />
      </section>
    </div>
  );
}
```

Note: `AccountEditor` now receives `buckets` — this prop is added in Task 6. After Task 5 the file will not type-check until Task 6 lands; that is expected. Both tasks ship as one logical change but split commits to keep diffs reviewable.

- [ ] **Step 2: Commit (without typecheck — known-broken until Task 6)**

```bash
git add app/finance/configuration/page.tsx
git commit -m "feat(finance): mount BucketEditor in configuration page"
```

---

## Task 6: Extend AccountEditor with bucket select + bucketId in accounts action

**Files:**
- Modify: `app/finance/_actions/accounts.ts`
- Modify: `app/finance/_components/AccountEditor.tsx`

- [ ] **Step 1: Accept bucketId in accounts schemas + persist**

Edit `app/finance/_actions/accounts.ts`. Update the imports if needed (no new imports). Replace `addSchema`, `addAccount`, `updateSchema`, `updateAccount` with:

```ts
const addSchema = z.object({
  name: z.string().trim().min(1).max(200),
  assetGroupId: z.uuid().nullable().optional(),
  bucketId: z.uuid().nullable().optional(),
  currencyId: z.uuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addAccount(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(account)
      .values({
        name: parsed.data.name,
        assetGroupId: parsed.data.assetGroupId ?? null,
        bucketId: parsed.data.bucketId ?? null,
        currencyId: parsed.data.currencyId ?? null,
        sortOrder: parsed.data.sortOrder,
      })
      .returning({ id: account.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Account name must be unique");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  assetGroupId: z.uuid().nullable().optional(),
  bucketId: z.uuid().nullable().optional(),
  currencyId: z.uuid().nullable().optional(),
});

export async function updateAccount(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const patch: Record<string, unknown> = { updatedAt: sql`now()` };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.assetGroupId !== undefined) patch.assetGroupId = parsed.data.assetGroupId;
  if (parsed.data.bucketId !== undefined) patch.bucketId = parsed.data.bucketId;
  if (parsed.data.currencyId !== undefined) patch.currencyId = parsed.data.currencyId;
  try {
    await db.update(account).set(patch).where(eq(account.id, parsed.data.id));
    revalidateFinanceRoutes();
    return { ok: true, data: undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Account name must be unique");
    throw e;
  }
}
```

- [ ] **Step 2: Add bucket select column to AccountEditor**

Edit `app/finance/_components/AccountEditor.tsx`. Replace the whole file with:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAccount, removeAccount, updateAccount } from "../_actions/accounts";
import type { Account, AssetGroup, Bucket, Currency } from "@/db/schema/finance";

const NONE = "__none__";

export function AccountEditor({
  accounts,
  groups,
  buckets,
  currencies,
}: {
  accounts: Account[];
  groups: AssetGroup[];
  buckets: Bucket[];
  currencies: Currency[];
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(NONE);
  const [bucketId, setBucketId] = useState<string>(NONE);
  const [currencyId, setCurrencyId] = useState<string>(NONE);
  const [pending, startTransition] = useTransition();

  function bucketsFor(groupIdValue: string | null): Bucket[] {
    if (!groupIdValue) return buckets;
    return buckets.filter((b) => b.assetGroupId === groupIdValue || b.assetGroupId === null);
  }

  function submit() {
    startTransition(async () => {
      const r = await addAccount({
        name,
        assetGroupId: groupId === NONE ? null : groupId,
        bucketId: bucketId === NONE ? null : bucketId,
        currencyId: currencyId === NONE ? null : currencyId,
        sortOrder: accounts.length,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setName("");
      setBucketId(NONE);
    });
  }

  function rename(a: Account, next: string) {
    if (next === a.name) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, name: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setGroup(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.assetGroupId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, assetGroupId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setBucket(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.bucketId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, bucketId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setCurrency(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.currencyId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, currencyId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(a: Account) {
    if (!confirm(`Remove account "${a.name}"?`)) return;
    startTransition(async () => {
      const r = await removeAccount(a.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">Računi / Imovina</h3>
        <p className="text-xs text-muted-foreground">
          Svaki račun ima ime, grupu, buket i jednu valutu.
        </p>
      </div>

      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.id} className="grid grid-cols-12 gap-2 items-center">
            <Input
              defaultValue={a.name}
              onBlur={(e) => rename(a, e.target.value.trim())}
              className="col-span-4"
            />
            <div className="col-span-3">
              <Select value={a.assetGroupId ?? NONE} onValueChange={(v) => setGroup(a, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Grupa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Select value={a.bucketId ?? NONE} onValueChange={(v) => setBucket(a, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Buket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {bucketsFor(a.assetGroupId).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Select value={a.currencyId ?? NONE} onValueChange={(v) => setCurrency(a, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Valuta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(a)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New account"
          className="col-span-4"
        />
        <div className="col-span-3">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Grupa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Select value={bucketId} onValueChange={setBucketId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Buket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {bucketsFor(groupId === NONE ? null : groupId).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Valuta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors. (This resolves the temporary break from Task 5.)

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev` (or use existing dev server).
Open `/finance/configuration`. Create a bucket "IBKR" in group "Broker" (create the group if missing). Assign an existing account to the IBKR bucket. Reload — bucket selection persists.

- [ ] **Step 5: Commit**

```bash
git add app/finance/_actions/accounts.ts app/finance/_components/AccountEditor.tsx
git commit -m "feat(finance): bucket select on account editor + action"
```

---

## Task 7: Pure aggregation helpers + unit tests

**Files:**
- Create: `lib/finance/aggregations.ts`
- Create: `lib/finance/aggregations.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/finance/aggregations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeGroupTotals, computeBucketTotals, type EurRow } from "./aggregations";

const rows: EurRow[] = [
  { accountId: "a1", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 100 },
  { accountId: "a2", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 50 },
  { accountId: "a3", groupId: "g2", groupName: "Gotovina", bucketId: null, bucketName: null, eur: 25 },
  { accountId: "a4", groupId: null, groupName: null, bucketId: "b2", bucketName: "IBKR", eur: 200 },
  { accountId: "a5", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 0 },
];

describe("computeGroupTotals", () => {
  it("sums per group, labels null as 'Bez grupe', skips zero totals", () => {
    expect(computeGroupTotals(rows)).toEqual([
      { groupId: "g1", name: "Banka", eur: 150 },
      { groupId: null, name: "Bez grupe", eur: 200 },
      { groupId: "g2", name: "Gotovina", eur: 25 },
    ]);
  });

  it("returns empty array when all rows are zero", () => {
    expect(computeGroupTotals([{ accountId: "x", groupId: "g", groupName: "G", bucketId: null, bucketName: null, eur: 0 }])).toEqual([]);
  });
});

describe("computeBucketTotals", () => {
  it("sums per bucket, labels null as 'Bez buketa', null bucket sorted last", () => {
    expect(computeBucketTotals(rows)).toEqual([
      { bucketId: "b2", name: "IBKR", eur: 200 },
      { bucketId: "b1", name: "Raiff", eur: 150 },
      { bucketId: null, name: "Bez buketa", eur: 25 },
    ]);
  });

  it("omits null bucket row when its total is zero", () => {
    const noNull: EurRow[] = [
      { accountId: "a", groupId: null, groupName: null, bucketId: "b1", bucketName: "B1", eur: 10 },
    ];
    expect(computeBucketTotals(noNull)).toEqual([{ bucketId: "b1", name: "B1", eur: 10 }]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run lib/finance/aggregations.test.ts`
Expected: FAIL (cannot resolve `./aggregations`).

- [ ] **Step 3: Implement aggregations**

Create `lib/finance/aggregations.ts`:

```ts
export type EurRow = {
  accountId: string;
  groupId: string | null;
  groupName: string | null;
  bucketId: string | null;
  bucketName: string | null;
  eur: number;
};

export type GroupTotal = { groupId: string | null; name: string; eur: number };
export type BucketTotal = { bucketId: string | null; name: string; eur: number };

export function computeGroupTotals(rows: EurRow[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const r of rows) {
    const key = r.groupId ?? "__null__";
    const existing = map.get(key);
    if (existing) {
      existing.eur += r.eur;
    } else {
      map.set(key, {
        groupId: r.groupId,
        name: r.groupName ?? "Bez grupe",
        eur: r.eur,
      });
    }
  }
  return Array.from(map.values())
    .filter((g) => g.eur !== 0)
    .sort((a, b) => b.eur - a.eur);
}

export function computeBucketTotals(rows: EurRow[]): BucketTotal[] {
  const map = new Map<string, BucketTotal>();
  for (const r of rows) {
    const key = r.bucketId ?? "__null__";
    const existing = map.get(key);
    if (existing) {
      existing.eur += r.eur;
    } else {
      map.set(key, {
        bucketId: r.bucketId,
        name: r.bucketName ?? "Bez buketa",
        eur: r.eur,
      });
    }
  }
  const filtered = Array.from(map.values()).filter((b) => b.eur !== 0);
  return filtered.sort((a, b) => {
    if (a.bucketId === null) return 1;
    if (b.bucketId === null) return -1;
    return b.eur - a.eur;
  });
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm vitest run lib/finance/aggregations.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/finance/aggregations.ts lib/finance/aggregations.test.ts
git commit -m "feat(finance): pure group/bucket aggregation helpers + tests"
```

---

## Task 8: Extend getPortfolio with group + bucket totals

**Files:**
- Modify: `lib/finance/portfolio.ts`

- [ ] **Step 1: Update SQL + return shape**

Replace `lib/finance/portfolio.ts` with:

```ts
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  assetGroup,
  bucket,
  currency,
  transaction,
} from "@/db/schema/finance";
import { getEurPerUnitLatest } from "./fx";
import {
  computeBucketTotals,
  computeGroupTotals,
  type BucketTotal,
  type GroupTotal,
} from "./aggregations";

export type PortfolioRow = {
  accountId: string;
  groupId: string | null;
  groupName: string | null;
  bucketId: string | null;
  bucketName: string | null;
  assetName: string;
  amount: number;
  currencyCode: string | null;
  priceEur: number | null;
  totalEur: number | null;
  share: number | null;
};

export type Portfolio = {
  rows: PortfolioRow[];
  netWorthEur: number;
  groupTotals: GroupTotal[];
  bucketTotals: BucketTotal[];
};

export async function getPortfolio(): Promise<Portfolio> {
  const balances = await db.execute<{
    account_id: string;
    account_name: string;
    group_id: string | null;
    group_name: string | null;
    bucket_id: string | null;
    bucket_name: string | null;
    currency_code: string | null;
    balance: string;
  }>(sql`
    WITH inflows AS (
      SELECT ${transaction.toAccountId} AS account_id,
             COALESCE(SUM(${transaction.inflowAmount}), 0) AS amount
      FROM ${transaction}
      WHERE ${transaction.toAccountId} IS NOT NULL
        AND ${transaction.inflowAmount} IS NOT NULL
      GROUP BY ${transaction.toAccountId}
    ),
    outflows AS (
      SELECT ${transaction.fromAccountId} AS account_id,
             COALESCE(SUM(${transaction.outflowAmount}), 0) AS amount
      FROM ${transaction}
      WHERE ${transaction.fromAccountId} IS NOT NULL
        AND ${transaction.outflowAmount} IS NOT NULL
      GROUP BY ${transaction.fromAccountId}
    )
    SELECT a.id AS account_id,
           a.name AS account_name,
           ag.id AS group_id,
           ag.name AS group_name,
           bk.id AS bucket_id,
           bk.name AS bucket_name,
           c.code AS currency_code,
           (COALESCE(i.amount, 0) - COALESCE(o.amount, 0))::text AS balance
    FROM ${account} a
    LEFT JOIN ${assetGroup} ag ON ag.id = a.asset_group_id
    LEFT JOIN ${bucket} bk ON bk.id = a.bucket_id
    LEFT JOIN ${currency} c ON c.id = a.currency_id
    LEFT JOIN inflows i ON i.account_id = a.id
    LEFT JOIN outflows o ON o.account_id = a.id
    WHERE a.archived_at IS NULL
    ORDER BY ag.sort_order NULLS LAST, ag.name NULLS LAST, a.sort_order, a.name
  `);

  const raw = balances.rows.map((r) => ({
    accountId: r.account_id,
    groupId: r.group_id,
    groupName: r.group_name,
    bucketId: r.bucket_id,
    bucketName: r.bucket_name,
    assetName: r.account_name,
    amount: Number(r.balance),
    currencyCode: r.currency_code,
  }));

  const codes = new Set(
    raw.filter((r) => r.amount !== 0 && r.currencyCode).map((r) => r.currencyCode as string),
  );
  const prices = new Map<string, number | null>();
  await Promise.all(
    Array.from(codes).map(async (c) => {
      prices.set(c, await getEurPerUnitLatest(c));
    }),
  );

  const withTotals = raw.map((r) => {
    const price = r.currencyCode ? prices.get(r.currencyCode) ?? null : null;
    const total = price != null ? r.amount * price : null;
    return {
      ...r,
      priceEur: price,
      totalEur: total,
    };
  });

  const netWorthEur = withTotals.reduce(
    (sum, r) => sum + (r.totalEur ?? 0),
    0,
  );

  const rows: PortfolioRow[] = withTotals.map((r) => ({
    ...r,
    share: netWorthEur > 0 && r.totalEur != null ? r.totalEur / netWorthEur : null,
  }));

  const eurRows = withTotals
    .filter((r) => r.totalEur != null && r.totalEur !== 0)
    .map((r) => ({
      accountId: r.accountId,
      groupId: r.groupId,
      groupName: r.groupName,
      bucketId: r.bucketId,
      bucketName: r.bucketName,
      eur: r.totalEur as number,
    }));

  return {
    rows,
    netWorthEur,
    groupTotals: computeGroupTotals(eurRows),
    bucketTotals: computeBucketTotals(eurRows),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/finance/portfolio.ts
git commit -m "feat(finance): portfolio returns group + bucket totals"
```

---

## Task 9: Install recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `pnpm add recharts`
Expected: `recharts` added under `dependencies` in `package.json`. Lockfile updated.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add recharts for portfolio chart"
```

---

## Task 10: PortfolioChart client component

**Files:**
- Create: `app/finance/_components/PortfolioChart.tsx`

- [ ] **Step 1: Write component**

Create `app/finance/_components/PortfolioChart.tsx`:

```tsx
"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { GroupTotal } from "@/lib/finance/aggregations";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];

function fmtEur(n: number): string {
  return n.toLocaleString("sr-RS", { maximumFractionDigits: 0 });
}

export function PortfolioChart({ groupTotals }: { groupTotals: GroupTotal[] }) {
  if (groupTotals.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Nema podataka za prikaz.
      </div>
    );
  }

  const total = groupTotals.reduce((s, g) => s + g.eur, 0);
  const data = groupTotals.map((g, i) => ({
    name: g.name,
    value: g.eur,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={1}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${fmtEur(value)} EUR (${total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"}%)`,
              name,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/PortfolioChart.tsx
git commit -m "feat(finance): PortfolioChart donut component"
```

---

## Task 11: New portfolio page layout

**Files:**
- Modify: `app/finance/portfolio/page.tsx`

- [ ] **Step 1: Rewrite page**

Replace `app/finance/portfolio/page.tsx` with:

```tsx
import { Card } from "@/components/ui/card";
import { getPortfolio } from "@/lib/finance/portfolio";
import { PortfolioChart } from "../_components/PortfolioChart";

export const dynamic = "force-dynamic";

function fmtAmount(n: number, maxFrac = 8): string {
  return n.toLocaleString("sr-RS", { maximumFractionDigits: maxFrac });
}

function fmtEur(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("sr-RS", { maximumFractionDigits: 2 });
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

export default async function PortfolioPage() {
  const { rows, netWorthEur, groupTotals, bucketTotals } = await getPortfolio();
  const visibleRows = rows.filter((r) => r.amount !== 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Stanje po računima sa trenutnim EUR cenama (live spot pri svakom učitavanju).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Net worth po grupi</div>
          <PortfolioChart groupTotals={groupTotals} />
        </Card>

        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Net worth</div>
            <div className="text-xl font-semibold tabular-nums">{fmtEur(netWorthEur)} EUR</div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-2 text-sm font-medium border-b">Po buketu</div>
            <table className="w-full text-sm">
              <tbody>
                {bucketTotals.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-muted-foreground">
                      Nema podataka.
                    </td>
                  </tr>
                )}
                {bucketTotals.map((b) => (
                  <tr key={b.bucketId ?? "__null__"} className="border-t">
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtEur(b.eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Grupa</th>
              <th className="px-4 py-2 font-medium">Buket</th>
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium">Valuta</th>
              <th className="px-4 py-2 font-medium text-right">Cena (EUR)</th>
              <th className="px-4 py-2 font-medium text-right">Total (EUR)</th>
              <th className="px-4 py-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Nema stanja. Unesi transakcije ili početno stanje.
                </td>
              </tr>
            )}
            {visibleRows.map((r) => (
              <tr key={r.accountId} className="border-t">
                <td className="px-4 py-2">{r.groupName ?? "—"}</td>
                <td className="px-4 py-2">{r.bucketName ?? "—"}</td>
                <td className="px-4 py-2">{r.assetName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtAmount(r.amount)}</td>
                <td className="px-4 py-2">{r.currencyCode ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.priceEur == null
                    ? "—"
                    : r.priceEur.toLocaleString("sr-RS", { maximumFractionDigits: 6 })}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEur(r.totalEur)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtPct(r.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verify**

Run: `pnpm dev` (or use existing dev server).
Open `/finance/portfolio`. Expected:
- Top row: donut chart on the left labeled with group names + tooltip; on the right the net-worth card and a compact bucket-totals card under it.
- Bottom: full-width per-account table with a new "Buket" column.
- Assigning a bucket to an account in `/finance/configuration` and reloading `/finance/portfolio` updates the bucket row.

- [ ] **Step 4: Commit**

```bash
git add app/finance/portfolio/page.tsx
git commit -m "feat(finance): portfolio page chart + bucket totals layout"
```

---

## Self-Review

- Spec coverage:
  - `finance_buckets` table + `account.bucket_id` → Task 1.
  - `getBuckets()` → Task 2.
  - Bucket server actions → Task 3.
  - `BucketEditor` mounted in configuration page → Tasks 4–5.
  - `AccountEditor` extended + `accounts.ts` accepts `bucketId` → Task 6.
  - `groupTotals` + `bucketTotals` in `getPortfolio` (with "Bez grupe" / "Bez buketa" handling, null-bucket sorted last, zero filtered) → Tasks 7–8.
  - `recharts` install → Task 9.
  - Donut chart → Task 10.
  - Two-column portfolio layout + existing per-account table preserved → Task 11.
- No placeholders (every step has exact code or commands).
- Type names consistent (`Bucket`, `bucketId`, `bucketName`, `GroupTotal`, `BucketTotal`, `EurRow`) across tasks 1, 2, 3, 4, 6, 7, 8, 10, 11.
- Task 5 commits a temporarily broken type-check; Task 6 resolves it. Documented in Task 5 step 1.
