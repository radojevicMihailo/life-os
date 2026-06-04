import { z } from "zod";

export const habitKindSchema = z.enum(["binary", "count"]);
export const habitCadenceSchema = z.enum(["daily", "weekly_target", "weekdays"]);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const baseHabit = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  description: z.string().max(10_000).optional().nullable(),
  kind: habitKindSchema,
  targetCount: z.number().int().min(1).max(100_000),
  unit: z.string().trim().max(40).optional().nullable(),
  cadence: habitCadenceSchema,
  weeklyTarget: z.number().int().min(0).max(7),
  weekdays: z.number().int().min(0).max(127),
  startDate: dateString,
  endDate: dateString.optional().nullable(),
});

type HabitFields = z.infer<typeof baseHabit>;

function checkCommon(v: HabitFields, ctx: z.RefinementCtx) {
  if (v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({
      code: "custom",
      message: "End date must be on or after start date",
      path: ["endDate"],
    });
  }
  if (v.cadence === "weekly_target" && v.weeklyTarget < 1) {
    ctx.addIssue({
      code: "custom",
      message: "Weekly target must be at least 1",
      path: ["weeklyTarget"],
    });
  }
  if (v.cadence === "weekdays" && (v.weekdays & 127) === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Pick at least one weekday",
      path: ["weekdays"],
    });
  }
}

export const createHabitSchema = baseHabit.superRefine(checkCommon);

export const updateHabitSchema = baseHabit
  .extend({ id: z.uuid() })
  .superRefine((v, ctx) => checkCommon(v, ctx));

export const upsertLogSchema = z.object({
  habitId: z.uuid(),
  date: dateString,
  count: z.number().int().min(0).max(1_000_000),
});

export const deleteLogSchema = z.object({
  habitId: z.uuid(),
  date: dateString,
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type UpsertLogInput = z.infer<typeof upsertLogSchema>;
export type DeleteLogInput = z.infer<typeof deleteLogSchema>;
