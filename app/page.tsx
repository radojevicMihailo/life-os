import { Suspense } from "react";
import Link from "next/link";
import { CalendarPanel, DashboardPanelLoading, GoalsPanel, HabitsPanel, TasksPanel } from "./_components/dashboard-panels";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Belgrade" }).format(now);
  return <div className="space-y-5 pb-8">
    <header className="relative isolate overflow-hidden rounded-3xl border border-blue-400/20 bg-[#07152b] p-5 text-white sm:p-6">
      <div aria-hidden className="absolute inset-0 -z-20 bg-[url('/images/home-hero.webp')] bg-cover bg-center opacity-40" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061020] to-[#061020]/40" />
      <p className="text-sm text-blue-200">{todayLabel}</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2"><h1 className="text-3xl font-semibold tracking-tight">Danas</h1><p className="text-sm text-blue-100">Danas biram <span className="font-medium text-cyan-300">napredak.</span></p></div>
      <nav aria-label="Brzi unos" className="mt-4 flex flex-wrap gap-2">{[
        ["/tasks?new=1", "+ Zadatak"], ["/finance/transactions#new-transaction", "+ Trošak"], ["/notes?new=1", "+ Beleška"], ["/meals?new=1", "+ Obrok"],
      ].map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-blue-300/30 bg-blue-950/70 px-3 py-2 text-sm font-medium hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">{label}</Link>)}</nav>
    </header>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Suspense fallback={<DashboardPanelLoading title="Prioritetni zadaci" />}><TasksPanel now={now} /></Suspense>
      <Suspense fallback={<DashboardPanelLoading title="Današnji plan" />}><CalendarPanel now={now} /></Suspense>
      <Suspense fallback={<DashboardPanelLoading title="Navike" />}><HabitsPanel now={now} /></Suspense>
      <Suspense fallback={<DashboardPanelLoading title="Finansijski ciljevi" />}><GoalsPanel /></Suspense>
    </div>
  </div>;
}
