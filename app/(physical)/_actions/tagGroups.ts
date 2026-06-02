"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityTagGroup } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const addSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function addTagGroup(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const [row] = await db
      .insert(activityTagGroup)
      .values(parsed.data)
      .returning({ id: activityTagGroup.id });
    revalidatePhysicalRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Tag group name must be unique");
    throw e;
  }
}

const renameSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100) });

export async function renameTagGroup(input: z.input<typeof renameSchema>): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await db.update(activityTagGroup).set({ name: parsed.data.name }).where(eq(activityTagGroup.id, parsed.data.id));
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}

export async function removeTagGroup(id: string): Promise<ActionResult> {
  await db.delete(activityTagGroup).where(eq(activityTagGroup.id, id));
  revalidatePhysicalRoutes();
  return { ok: true, data: undefined };
}
