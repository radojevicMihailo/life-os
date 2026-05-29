import { z } from "zod";

const colorRegex = /^#[0-9a-fA-F]{6}$/;

export const createContextSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(50),
  color: z.string().regex(colorRegex, "Invalid color").optional().nullable(),
});

export const updateContextSchema = createContextSchema.partial().extend({
  id: z.uuid(),
});

export type CreateContextInput = z.infer<typeof createContextSchema>;
export type UpdateContextInput = z.infer<typeof updateContextSchema>;
