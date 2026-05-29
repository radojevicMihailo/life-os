import { z } from "zod";

export const recurrenceRuleSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().positive(),
  byweekday: z.array(z.number().int().min(0).max(6)).optional(),
});

export const taskStatusSchema = z.enum([
  "backlog",
  "in_progress",
  "waiting_for",
  "canceled",
  "done",
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  notes: z.string().max(10_000).optional().nullable(),
  projectId: z.uuid().optional().nullable(),
  parentTaskId: z.uuid().optional().nullable(),
  priorityId: z.uuid().optional().nullable(),
  status: taskStatusSchema.optional(),
  actionAt: z.date().optional().nullable(),
  actionEndAt: z.date().optional().nullable(),
  dueAt: z.date().optional().nullable(),
  recurrence: recurrenceRuleSchema.optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.uuid(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
