import { revalidatePath } from "next/cache";

export function revalidateNoteRoutes(opts?: { noteId?: string }) {
  revalidatePath("/notes");
  revalidatePath("/notes/settings");
  if (opts?.noteId) revalidatePath(`/notes/${opts.noteId}`);
}
