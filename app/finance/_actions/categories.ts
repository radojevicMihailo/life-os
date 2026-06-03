"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactionCategory, categoryKindEnum } from "@/db/schema/finance";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const kindSchema = z.enum(categoryKindEnum.enumValues);

const addSchema = z.object({
  kind: kindSchema,
  name: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addCategory(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db.insert(transactionCategory).values(parsed.data).returning({ id: transactionCategory.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Category name must be unique in its kind");
    throw e;
  }
}

const renameSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(200) });

export async function renameCategory(input: z.input<typeof renameSchema>): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    await db
      .update(transactionCategory)
      .set({ name: parsed.data.name })
      .where(eq(transactionCategory.id, parsed.data.id));
    revalidateFinanceRoutes();
    return { ok: true, data: undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Category name must be unique in its kind");
    throw e;
  }
}

export async function removeCategory(id: string): Promise<ActionResult> {
  await db.delete(transactionCategory).where(eq(transactionCategory.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}
