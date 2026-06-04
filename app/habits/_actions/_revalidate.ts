import { revalidatePath } from "next/cache";

export function revalidateHabitRoutes(opts?: { habitId?: string }) {
  revalidatePath("/habits");
  revalidatePath("/habits/manage");
  if (opts?.habitId) revalidatePath(`/habits/${opts.habitId}/edit`);
}
