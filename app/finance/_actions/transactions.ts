"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { account, currency, transaction } from "@/db/schema/finance";
import { computeFx } from "@/lib/finance/fx";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const typeSchema = z.string().trim().min(1).max(50);

const upsertSchema = z.object({
  id: z.uuid().optional(),
  occurredOn: z.iso.date(),
  type: typeSchema,
  description: z.string().trim().max(1000).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  subcategoryId: z.uuid().nullable().optional(),
  fromAccountId: z.uuid().nullable().optional(),
  toAccountId: z.uuid().nullable().optional(),
  outflowAmount: z
    .union([z.number(), z.string()])
    .transform((v) => (v === "" || v == null ? null : Number(v)))
    .nullable()
    .optional(),
  outflowCurrencyId: z.uuid().nullable().optional(),
  inflowAmount: z
    .union([z.number(), z.string()])
    .transform((v) => (v === "" || v == null ? null : Number(v)))
    .nullable()
    .optional(),
  inflowCurrencyId: z.uuid().nullable().optional(),
});

async function resolveCurrencyCode(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const [row] = await db
    .select({ code: currency.code })
    .from(currency)
    .where(eq(currency.id, id))
    .limit(1);
  return row?.code ?? null;
}

async function fxForRow(input: {
  occurredOn: string;
  inflowAmount: number | null | undefined;
  inflowCurrencyId: string | null | undefined;
  outflowAmount: number | null | undefined;
  outflowCurrencyId: string | null | undefined;
}) {
  const useInflow =
    input.inflowAmount != null && !Number.isNaN(input.inflowAmount) && input.inflowCurrencyId;
  const useOutflow =
    !useInflow &&
    input.outflowAmount != null &&
    !Number.isNaN(input.outflowAmount) &&
    input.outflowCurrencyId;
  const amount = useInflow ? input.inflowAmount : useOutflow ? input.outflowAmount : null;
  const currencyId = useInflow
    ? input.inflowCurrencyId
    : useOutflow
      ? input.outflowCurrencyId
      : null;
  if (amount == null || !currencyId) {
    return { eurRate: null, eurAmount: null, usdRate: null, usdAmount: null };
  }
  const code = await resolveCurrencyCode(currencyId);
  if (!code) return { eurRate: null, eurAmount: null, usdRate: null, usdAmount: null };
  return computeFx({ amount, code, date: input.occurredOn });
}

function toNumeric(v: number | null): string | null {
  return v == null || Number.isNaN(v) ? null : v.toFixed(8);
}

export async function saveTransaction(
  input: z.input<typeof upsertSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const fx = await fxForRow({
    occurredOn: d.occurredOn,
    inflowAmount: d.inflowAmount ?? null,
    inflowCurrencyId: d.inflowCurrencyId ?? null,
    outflowAmount: d.outflowAmount ?? null,
    outflowCurrencyId: d.outflowCurrencyId ?? null,
  });

  const values = {
    occurredOn: d.occurredOn,
    type: d.type,
    description: d.description ?? null,
    categoryId: d.categoryId ?? null,
    subcategoryId: d.subcategoryId ?? null,
    fromAccountId: d.fromAccountId ?? null,
    toAccountId: d.toAccountId ?? null,
    outflowAmount: toNumeric(d.outflowAmount ?? null),
    outflowCurrencyId: d.outflowCurrencyId ?? null,
    inflowAmount: toNumeric(d.inflowAmount ?? null),
    inflowCurrencyId: d.inflowCurrencyId ?? null,
    eurRate: toNumeric(fx.eurRate),
    eurAmount: toNumeric(fx.eurAmount),
    usdRate: toNumeric(fx.usdRate),
    usdAmount: toNumeric(fx.usdAmount),
    updatedAt: sql`now()`,
  };

  if (d.id) {
    await db.update(transaction).set(values).where(eq(transaction.id, d.id));
    revalidateFinanceRoutes();
    return { ok: true, data: { id: d.id } };
  }

  const [row] = await db.insert(transaction).values(values).returning({ id: transaction.id });
  revalidateFinanceRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await db.delete(transaction).where(eq(transaction.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}

// Validate account exists for type errors (placeholder for future)
export async function _ping(): Promise<ActionResult> {
  await db.select({ id: account.id }).from(account).limit(1);
  return { ok: true, data: undefined };
}
