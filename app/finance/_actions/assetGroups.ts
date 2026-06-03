"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assetGroup } from "@/db/schema/finance";
import { revalidateFinanceRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addAssetGroup(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db.insert(assetGroup).values(parsed.data).returning({ id: assetGroup.id });
    revalidateFinanceRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Group name must be unique");
    throw e;
  }
}

const renameSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100) });

export async function renameAssetGroup(input: z.input<typeof renameSchema>): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    await db.update(assetGroup).set({ name: parsed.data.name }).where(eq(assetGroup.id, parsed.data.id));
    revalidateFinanceRoutes();
    return { ok: true, data: undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Group name must be unique");
    throw e;
  }
}

export async function removeAssetGroup(id: string): Promise<ActionResult> {
  await db.delete(assetGroup).where(eq(assetGroup.id, id));
  revalidateFinanceRoutes();
  return { ok: true, data: undefined };
}
