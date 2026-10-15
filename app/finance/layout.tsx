import { FinancePrivacy } from "@/modules/finance/ui/components/finance-privacy";
import type { ReactNode } from "react";
import { AppNav } from "@/modules/finance/ui/components/app-nav";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function FinanceLayout({ children }: { children: ReactNode }) {
 return <section className="finance-area min-w-0 rounded-3xl border border-blue-400/20 bg-card p-4 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:p-6">
  <FinancePrivacy><AppNav /><div className="pt-6">{children}</div></FinancePrivacy>
 </section>;
}
