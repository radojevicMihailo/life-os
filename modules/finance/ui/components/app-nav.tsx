import Link from "next/link";

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
  return (
    <nav
      aria-label="Finansije"
      className="sticky top-14 z-20 overflow-x-auto rounded-xl bg-slate-950/95 py-2 backdrop-blur md:top-0"
    >
      <ul className="mx-auto flex w-max min-w-full gap-2">
        {destinations.map((destination) => (
          <li key={destination.href} className="shrink-0 md:flex-1">
            <Link
              className="flex min-h-11 items-center justify-center rounded-xl px-1 text-center text-[0.65rem] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 sm:text-xs md:px-3 md:text-sm"
              href={destination.href}
            >
              <span className="md:hidden">{destination.shortLabel}</span>
              <span className="hidden md:inline">{destination.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
