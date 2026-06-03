"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  TRANSACTION_TYPE_COLORS,
  categoryKindEnum,
  transactionType,
} from "@/db/schema/finance";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const KEY_RE = /^[a-z][a-z0-9_]*$/;

const colorSchema = z.enum(TRANSACTION_TYPE_COLORS);
const kindSchema = z.enum(categoryKindEnum.enumValues).nullable().optional();

const addSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(KEY_RE, "Key mora biti snake_case (npr. moj_tip)"),
  label: z.string().trim().min(1).max(100),
  color: colorSchema.default("gray"),
  categoryKind: kindSchema,
  showsFrom: z.boolean().default(true),
  showsTo: z.boolean().default(true),
  showsOutflow: z.boolean().default(true),
  showsInflow: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addTransactionType(
  input: z.input<typeof addSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(transactionType)
      .values({ ...parsed.data, categoryKind: parsed.data.categoryKind ?? null })
      .returning({ id: transactionType.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Key već postoji");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1).max(100).optional(),
  color: colorSchema.optional(),
  categoryKind: kindSchema,
  showsFrom: z.boolean().optional(),
  showsTo: z.boolean().optional(),
  showsOutflow: z.boolean().optional(),
  showsInflow: z.boolean().optional(),
});

export async function updateTransactionType(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, categoryKind, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if (categoryKind !== undefined) patch.categoryKind = categoryKind;
  await db.update(transactionType).set(patch).where(eq(transactionType.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}

export async function removeTransactionType(id: string): Promise<ActionResult> {
  await db.delete(transactionType).where(eq(transactionType.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}
