import { z } from "zod";

export const goalStatusSchema = z.enum(["active", "done", "paused", "canceled"]);
export const goalHorizonSchema = z.enum(["yearly", "monthly", "weekly", "daily"]);

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  description: z.string().max(10_000).optional().nullable(),
  status: goalStatusSchema.optional(),
  horizon: goalHorizonSchema.optional(),
  targetDate: z.date().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  id: z.uuid(),
});

export const createMilestoneSchema = z.object({
  goalId: z.uuid(),
  title: z.string().trim().min(1, "Title required").max(500),
  dueDate: z.date().optional().nullable(),
});

export const updateMilestoneSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  dueDate: z.date().optional().nullable(),
  doneAt: z.date().optional().nullable(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
