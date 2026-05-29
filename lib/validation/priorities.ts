import { z } from "zod";

const colorRegex = /^#[0-9a-fA-F]{6}$/;

export const createPrioritySchema = z.object({
  name: z.string().trim().min(1, "Name required").max(50),
  color: z.string().regex(colorRegex, "Invalid color").optional().nullable(),
});

export const updatePrioritySchema = createPrioritySchema.partial().extend({
  id: z.uuid(),
});

export type CreatePriorityInput = z.infer<typeof createPrioritySchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
