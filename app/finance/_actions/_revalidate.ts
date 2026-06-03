import { revalidatePath } from "next/cache";

export function revalidateFinanceRoutes() {
  revalidatePath("/finance");
  revalidatePath("/finance/configuration");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/portfolio");
}
