import { revalidatePath } from "next/cache";

export function revalidateTravelRoutes() {
  revalidatePath("/travels");
}
