import { revalidatePath } from "next/cache";

export function revalidateTaskRoutes(opts?: { projectId?: string; taskId?: string }) {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/context");
  revalidatePath("/priorities");
  if (opts?.projectId) revalidatePath(`/projects/${opts.projectId}`);
  if (opts?.taskId) revalidatePath(`/tasks/${opts.taskId}`);
}
