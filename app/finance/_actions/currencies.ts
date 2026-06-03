"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { currency } from "@/db/schema/finance";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  code: z.string().trim().min(1).max(20),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addCurrency(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db.insert(currency).values(parsed.data).returning({ id: currency.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Currency code must be unique");
    throw e;
  }
}

const updateSchema = z.object({ id: z.uuid(), code: z.string().trim().min(1).max(20) });

export async function updateCurrency(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    await db.update(currency).set({ code: parsed.data.code }).where(eq(currency.id, parsed.data.id));
    revalidateFinanceRoutes();
    return { ok: true, data: undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Currency code must be unique");
    throw e;
  }
}

export async function removeCurrency(id: string): Promise<ActionResult> {
  await db.delete(currency).where(eq(currency.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}
