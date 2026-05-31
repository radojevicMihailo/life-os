"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { modality } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const nameSchema = z.string().trim().min(1, "Name required").max(100);

export async function createModality(name: string): Promise<ActionResult<{ id: string }>> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name");
  try {
    const [row] = await db
      .insert(modality)
      .values({ name: parsed.data })
      .returning({ id: modality.id });
    revalidatePhysicalRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Modality name must be unique");
    throw e;
  }
}

export async function renameModality(id: string, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name");
  await db
    .update(modality)
    .set({ name: parsed.data, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}

export async function archiveModality(id: string): Promise<ActionResult> {
  await db
    .update(modality)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}

export async function unarchiveModality(id: string): Promise<ActionResult> {
  await db
    .update(modality)
    .set({ archivedAt: null, updatedAt: sql`now()` })
    .where(eq(modality.id, id));
  revalidatePhysicalRoutes({ modalityId: id });
  return { ok: true, data: undefined };
}
