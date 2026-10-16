"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/finance", label: "Pregled" },
  { href: "/finance/planning", label: "Planiranje" },
  { href: "/finance/transactions", label: "Transakcije" },
  { href: "/finance/accounts", label: "Računi" },
  { href: "/finance/budgets", label: "Budžeti" },
  { href: "/finance/goals", label: "Ciljevi" },
  { href: "/finance/investments", label: "Investicije" },
  { href: "/finance/reports", label: "Izveštaji" },
  { href: "/finance/settings", label: "Podešavanja" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-16 z-20 space-y-3 bg-card/95 backdrop-blur md:top-0">
      <div className="flex justify-end">
        <Link href="/finance/transactions#new-transaction" className="action-button inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white">Nova transakcija</Link>
      </div>
      <nav
        aria-label="Finansije"
        className="overflow-x-auto rounded-2xl border border-blue-400/20 bg-card/95 p-1.5 backdrop-blur"
      >
        <ul className="flex w-max min-w-full gap-1">
          {destinations.map((destination) => {
            const active = pathname === destination.href;
            return (
            <li key={destination.href} className="shrink-0 sm:flex-1">
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${active ? "active-section-tab" : "text-foreground hover:bg-blue-400/15 hover:text-foreground"}`}
                href={destination.href}
              >
                {destination.label}
              </Link>
            </li>
          );})}
        </ul>
      </nav>
    </div>
  );
}
