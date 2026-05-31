import { revalidatePath } from "next/cache";

export function revalidatePhysicalRoutes(opts?: {
  modalityId?: string;
  activityId?: string;
  planId?: string;
}) {
  revalidatePath("/configuration");
  revalidatePath("/activities");
  revalidatePath("/plans");
  if (opts?.modalityId) revalidatePath(`/configuration/${opts.modalityId}`);
  if (opts?.activityId) revalidatePath(`/activities/${opts.activityId}`);
  if (opts?.planId) revalidatePath(`/plans/${opts.planId}`);
}
