import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
});

export const updateProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  archived: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
