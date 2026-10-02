import { z } from "zod";
import { TASK_PRIORITIES } from "@/lib/task-priorities";

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

const taskFields = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  notes: z.string().max(10_000).optional().nullable(),
  projectId: z.uuid().optional().nullable(),
  parentTaskId: z.uuid().optional().nullable(),
  priorityId: z.enum(TASK_PRIORITIES.map((p) => p.id)).optional().nullable(),
  status: taskStatusSchema.optional(),
  actionAt: z.date().optional().nullable(),
  actionEndAt: z.date().optional().nullable(),
  dueAt: z.date().optional().nullable(),
  recurrence: recurrenceRuleSchema.optional().nullable(),
  contextIds: z.array(z.uuid()).transform((ids) => [...new Set(ids)]).optional(),
});

function validActionRange(v: { actionAt?: Date | null; actionEndAt?: Date | null }) {
  return !v.actionAt || !v.actionEndAt || v.actionEndAt >= v.actionAt;
}
export const createTaskSchema = taskFields.refine(validActionRange, {
  message: "Kraj aktivnosti ne može biti pre početka.", path: ["actionEndAt"],
}).refine((v) => !v.actionEndAt || !!v.actionAt, {
  message: "Unesi početak aktivnosti pre završetka.", path: ["actionAt"],
});
export const updateTaskSchema = taskFields.partial().extend({ id: z.uuid() }).refine(validActionRange, {
  message: "Kraj aktivnosti ne može biti pre početka.", path: ["actionEndAt"],
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
