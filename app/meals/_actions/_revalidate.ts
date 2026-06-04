import { revalidatePath } from "next/cache";

export function revalidateMealRoutes(opts?: {
  date?: string;
  foodId?: string;
  templateId?: string;
  mealId?: string;
}) {
  revalidatePath("/meals");
  revalidatePath("/meals/calendar");
  revalidatePath("/meals/library");
  revalidatePath("/meals/templates");
  if (opts?.date) revalidatePath(`/meals/${opts.date}`);
  if (opts?.foodId) revalidatePath(`/meals/library/${opts.foodId}`);
  if (opts?.templateId) revalidatePath(`/meals/templates/${opts.templateId}`);
}
