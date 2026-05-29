import { z } from "zod";

const colorRegex = /^#[0-9a-fA-F]{6}$/;

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(50),
  color: z.string().regex(colorRegex, "Invalid color").optional().nullable(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
