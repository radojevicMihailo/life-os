import { revalidatePath } from "next/cache";

export function revalidateNoteRoutes(opts?: { noteId?: string }) {
  revalidatePath("/notes");
  if (opts?.noteId) revalidatePath(`/notes/${opts.noteId}`);
}
