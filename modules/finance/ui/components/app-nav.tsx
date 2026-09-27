"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/finance", label: "Pregled", shortLabel: "Pregled" },
  { href: "/finance/transactions", label: "Transakcije", shortLabel: "Promet" },
  { href: "/finance/accounts", label: "Računi", shortLabel: "Računi" },
  { href: "/finance/budgets", label: "Budžeti", shortLabel: "Budžeti" },
  { href: "/finance/goals", label: "Ciljevi", shortLabel: "Ciljevi" },
  { href: "/finance/investments", label: "Investicije", shortLabel: "Ulaganja" },
  { href: "/finance/settings", label: "Podešavanja", shortLabel: "Postavke" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Finansije"
      className="sticky top-16 z-20 overflow-x-auto rounded-2xl border border-blue-400/20 bg-[#0d203c]/95 p-1.5 backdrop-blur md:top-0"
    >
      <ul className="mx-auto flex w-max min-w-full gap-2">
        {destinations.map((destination) => {
          const active = pathname === destination.href;
          return (
          <li key={destination.href} className="shrink-0 md:flex-1">
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-xl px-1 text-center text-[0.65rem] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-xs md:px-3 md:text-sm ${active ? "active-section-tab" : "text-slate-300 hover:bg-blue-400/15 hover:text-white"}`}
              href={destination.href}
            >
              <span className="md:hidden">{destination.shortLabel}</span>
              <span className="hidden md:inline">{destination.label}</span>
            </Link>
          </li>
        );})}
      </ul>
    </nav>
  );
}
