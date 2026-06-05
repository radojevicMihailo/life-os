import { revalidatePath } from "next/cache";

export function revalidatePhysicalRoutes(opts?: {
  activityId?: string;
  workoutPlanId?: string;
  splitId?: string;
}) {
  revalidatePath("/configuration");
  revalidatePath("/activities");
  revalidatePath("/plans");
  revalidatePath("/plans/workouts");
  revalidatePath("/plans/splits");
  if (opts?.activityId) revalidatePath(`/activities/${opts.activityId}`);
  if (opts?.workoutPlanId) revalidatePath(`/plans/workouts/${opts.workoutPlanId}`);
  if (opts?.splitId) revalidatePath(`/plans/splits/${opts.splitId}`);
}
