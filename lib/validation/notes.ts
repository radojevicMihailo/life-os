import { z } from "zod";

export const noteKindSchema = z.enum(["free", "todo"]);

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  kind: noteKindSchema.optional().default("free"),
});

export const updateNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Title required").max(500).optional(),
  body: z.string().max(100_000).optional(),
  kind: noteKindSchema.optional(),
});

export const deleteNoteSchema = z.object({ id: z.uuid() });

export const addItemSchema = z.object({
  noteId: z.uuid(),
  text: z.string().trim().min(1, "Text required").max(1_000),
});

export const updateItemTextSchema = z.object({
  id: z.uuid(),
  text: z.string().trim().min(1, "Text required").max(1_000),
});

export const toggleItemSchema = z.object({
  id: z.uuid(),
  done: z.boolean(),
});

export const reorderItemSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});

export const deleteItemSchema = z.object({ id: z.uuid() });

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemTextInput = z.infer<typeof updateItemTextSchema>;
export type ToggleItemInput = z.infer<typeof toggleItemSchema>;
export type ReorderItemInput = z.infer<typeof reorderItemSchema>;
