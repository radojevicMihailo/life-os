import { z, ZodTypeAny } from "zod";
import type { PhysicalField } from "@/db/schema/physical";

export const setEntrySchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
});

function baseFragment(kind: PhysicalField["kind"]): ZodTypeAny {
  switch (kind) {
    case "text":
      return z.string().max(10_000);
    case "number":
      return z.number().int();
    case "decimal":
      return z.number();
    case "duration_sec":
      return z.number().int().min(0);
    case "distance_km":
      return z.number().nonnegative();
    case "sets_array":
      return z.array(setEntrySchema);
    case "category_ref":
    case "exercise_ref":
      return z.uuid();
  }
}

function fieldFragment(field: PhysicalField): ZodTypeAny {
  const base = baseFragment(field.kind);
  return field.required ? base : base.optional().nullable();
}

function buildValuesSchema(fields: PhysicalField[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) shape[f.key] = fieldFragment(f);
  return z.object(shape);
}

export function buildActivityValuesSchema(fields: PhysicalField[]) {
  return buildValuesSchema(fields.filter((f) => f.scope === "top"));
}

export function buildSubrowValuesSchema(fields: PhysicalField[]) {
  return buildValuesSchema(fields.filter((f) => f.scope === "subrow"));
}

export function activityPayloadSchema(
  topFields: PhysicalField[],
  subrowFields: PhysicalField[],
) {
  const valuesSchema = buildActivityValuesSchema(topFields);
  const subrowValuesSchema = buildSubrowValuesSchema(subrowFields);
  return z.object({
    performedAt: z.date(),
    values: valuesSchema,
    comment: z.string().max(10_000).optional().nullable(),
    subrows: z
      .array(
        z.object({
          exerciseId: z.uuid().optional().nullable(),
          values: subrowValuesSchema,
          sortOrder: z.number().int().nonnegative(),
        }),
      )
      .default([]),
  });
}

export function planPayloadSchema(subrowFields: PhysicalField[]) {
  const subrowValuesSchema = buildSubrowValuesSchema(subrowFields);
  return z.object({
    name: z.string().trim().min(1).max(200),
    notes: z.string().max(20_000).optional().nullable(),
    subrows: z
      .array(
        z.object({
          exerciseId: z.uuid().optional().nullable(),
          values: subrowValuesSchema,
          sortOrder: z.number().int().nonnegative(),
        }),
      )
      .default([]),
  });
}

export type ActivityPayload = z.infer<ReturnType<typeof activityPayloadSchema>>;
export type PlanPayload = z.infer<ReturnType<typeof planPayloadSchema>>;
