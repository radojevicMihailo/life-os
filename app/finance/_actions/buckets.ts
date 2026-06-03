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
