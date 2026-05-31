"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
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
    const [row] = await db.insert(category).values(parsed.data).returning({ id: category.id });
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
  await db.update(category).set({ name: parsed.data.name }).where(eq(category.id, parsed.data.id));
  const [row] = await db
    .select({ modalityId: category.modalityId })
    .from(category)
    .where(eq(category.id, parsed.data.id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function removeCategory(id: string): Promise<ActionResult> {
  const [row] = await db
    .select({ modalityId: category.modalityId })
    .from(category)
    .where(eq(category.id, id));
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
