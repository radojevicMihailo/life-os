"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activity, activitySubrow, physicalField } from "@/db/schema/physical";
import { activityPayloadSchema, type ActivityPayload } from "@/lib/validation/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function getFields(modalityId: string) {
  return db.select().from(physicalField).where(eq(physicalField.modalityId, modalityId));
}

function coerceDate(value: unknown): unknown {
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
}

function normalize(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "performedAt" in raw) {
    const obj = raw as Record<string, unknown>;
    return { ...obj, performedAt: coerceDate(obj.performedAt) };
  }
  return raw;
}

export async function createActivity(
  modalityId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const fields = await getFields(modalityId);
  const schema = activityPayloadSchema(
    fields.filter((f) => f.scope === "top"),
    fields.filter((f) => f.scope === "subrow"),
  );
  const parsed = schema.safeParse(normalize(raw));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const payload = parsed.data as ActivityPayload;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(activity)
      .values({
        modalityId,
        performedAt: payload.performedAt,
        values: payload.values,
        comment: payload.comment ?? null,
      })
      .returning({ id: activity.id });

    if (payload.subrows.length > 0) {
      await tx.insert(activitySubrow).values(
        payload.subrows.map((s) => ({
          activityId: row.id,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
    return row.id;
  });

  revalidatePhysicalRoutes({ activityId: id });
  return { ok: true, data: { id } };
}

export async function updateActivity(
  activityId: string,
  modalityId: string,
  raw: unknown,
): Promise<ActionResult> {
  const fields = await getFields(modalityId);
  const schema = activityPayloadSchema(
    fields.filter((f) => f.scope === "top"),
    fields.filter((f) => f.scope === "subrow"),
  );
  const parsed = schema.safeParse(normalize(raw));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const payload = parsed.data as ActivityPayload;

  await db.transaction(async (tx) => {
    await tx
      .update(activity)
      .set({
        performedAt: payload.performedAt,
        values: payload.values,
        comment: payload.comment ?? null,
      })
      .where(eq(activity.id, activityId));
    await tx.delete(activitySubrow).where(eq(activitySubrow.activityId, activityId));
    if (payload.subrows.length > 0) {
      await tx.insert(activitySubrow).values(
        payload.subrows.map((s) => ({
          activityId,
          exerciseId: s.exerciseId ?? null,
          values: s.values,
          sortOrder: s.sortOrder,
        })),
      );
    }
  });

  revalidatePhysicalRoutes({ activityId });
  return { ok: true, data: undefined };
}

export async function deleteActivity(activityId: string): Promise<ActionResult> {
  await db.delete(activity).where(eq(activity.id, activityId));
  revalidatePhysicalRoutes({ activityId });
  return { ok: true, data: undefined };
}
