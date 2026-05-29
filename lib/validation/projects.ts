import { z } from "zod";

export const projectStatusSchema = z.enum([
  "planning",
  "active",
  "on_hold",
  "completed",
  "canceled",
]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  status: projectStatusSchema.optional(),
  startAt: z.date().optional().nullable(),
  dueAt: z.date().optional().nullable(),
});

export const updateProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  status: projectStatusSchema.optional(),
  startAt: z.date().optional().nullable(),
  dueAt: z.date().optional().nullable(),
  archived: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
