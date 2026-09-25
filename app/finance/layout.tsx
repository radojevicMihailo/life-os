import type { ReactNode } from "react";
import { AppNav } from "@/modules/finance/ui/components/app-nav";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function FinanceLayout({ children }: { children: ReactNode }) {
 return <section className="min-w-0 rounded-2xl bg-slate-950 p-4 text-slate-50 sm:p-6">
  <AppNav /><div className="pt-6">{children}</div>
 </section>;
}
