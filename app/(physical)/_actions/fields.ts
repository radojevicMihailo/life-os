"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { physicalField, fieldKindEnum, fieldScopeEnum } from "@/db/schema/physical";
import { revalidatePhysicalRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, digits, underscores; must start with a letter");

const addSchema = z.object({
  modalityId: z.uuid(),
  scope: z.enum(fieldScopeEnum.enumValues),
  key: keySchema,
  label: z.string().trim().min(1).max(120),
  kind: z.enum(fieldKindEnum.enumValues),
  required: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function addField(input: z.input<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;
  if (data.kind === "sets_array" && data.scope !== "subrow") {
    return fail("sets_array only valid on subrow fields");
  }
  try {
    const [row] = await db
      .insert(physicalField)
      .values({
        modalityId: data.modalityId,
        scope: data.scope,
        key: data.key,
        label: data.label,
        kind: data.kind,
        required: data.required,
        sortOrder: data.sortOrder,
        config: (data.config ?? null) as never,
      })
      .returning({ id: physicalField.id });
    revalidatePhysicalRoutes({ modalityId: data.modalityId });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Field key must be unique within scope");
    throw e;
  }
}

const updateSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1).max(120).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function updateField(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db
    .update(physicalField)
    .set({ ...patch, updatedAt: sql`now()` } as never)
    .where(eq(physicalField.id, id));
  const [row] = await db
    .select({ modalityId: physicalField.modalityId })
    .from(physicalField)
    .where(eq(physicalField.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function removeField(id: string): Promise<ActionResult> {
  const [row] = await db
    .select({ modalityId: physicalField.modalityId })
    .from(physicalField)
    .where(eq(physicalField.id, id));
  await db.delete(physicalField).where(eq(physicalField.id, id));
  revalidatePhysicalRoutes({ modalityId: row?.modalityId });
  return { ok: true, data: undefined };
}

export async function reorderFields(
  modalityId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(physicalField)
        .set({ sortOrder: i, updatedAt: sql`now()` })
        .where(and(eq(physicalField.id, orderedIds[i]), eq(physicalField.modalityId, modalityId)));
    }
  });
  revalidatePhysicalRoutes({ modalityId });
  return { ok: true, data: undefined };
}
