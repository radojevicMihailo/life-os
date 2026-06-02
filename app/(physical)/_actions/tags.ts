"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityTag } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  groupId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addTag(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(activityTag)
      .values(parsed.data)
      .returning({ id: activityTag.id });
    revalidatePhysicalRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Tag name must be unique within group");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  groupId: z.uuid().optional(),
});

export async function updateTag(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  try {
    await db.update(activityTag).set(patch).where(eq(activityTag.id, id));
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Tag name must be unique within group");
    throw e;
  }
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}

export async function removeTag(id: string): Promise<ActionResult> {
  await db.delete(activityTag).where(eq(activityTag.id, id));
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}
