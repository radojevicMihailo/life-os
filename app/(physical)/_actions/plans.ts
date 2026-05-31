"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { physicalField, plan, planSubrow } from "@/db/schema/physical";
import { planPayloadSchema } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function getFields(modalityId: string) {
  return db.select().from(physicalField).where(eq(physicalField.modalityId, modalityId));
}

export async function createPlan(modalityId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const fields = await getFields(modalityId);
  const schema = planPayloadSchema(fields.filter((f) => f.scope === "subrow"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(plan)
      .values({ modalityId, name: data.name, notes: data.notes ?? null })
      .returning({ id: plan.id });
    if (data.subrows.length > 0) {
      await tx.insert(planSubrow).values(
        data.subrows.map((s) => ({
          planId: row.id,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
    return row.id;
  });

  revalidatePhysicalRoutes({ planId: id });
  return { ok: true, data: { id } };
}

export async function updatePlan(planId: string, modalityId: string, raw: unknown): Promise<ActionResult> {
  const fields = await getFields(modalityId);
  const schema = planPayloadSchema(fields.filter((f) => f.scope === "subrow"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(plan)
      .set({ name: data.name, notes: data.notes ?? null, updatedAt: sql`now()` })
      .where(eq(plan.id, planId));
    await tx.delete(planSubrow).where(eq(planSubrow.planId, planId));
    if (data.subrows.length > 0) {
      await tx.insert(planSubrow).values(
        data.subrows.map((s) => ({
          planId,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
  });
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}

export async function archivePlan(planId: string): Promise<ActionResult> {
  await db
    .update(plan)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(plan.id, planId));
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  await db.delete(plan).where(eq(plan.id, planId));
  revalidatePhysicalRoutes({ planId });
  return { ok: true, data: undefined };
}
