import { Suspense } from "react";
import { belgradeDayKey } from "@/lib/day";
import { CalendarPanel, DashboardPanelLoading, GoalsPanel, HabitsPanel, TasksPanel } from "./_components/dashboard-panels";
import { DashboardQuickAdd } from "./_components/dashboard-quick-add";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Belgrade",
  }).format(now);

  return (
    <div className="today-dashboard pb-8">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border pb-5 sm:mb-7 sm:pb-6">
        <h1 className="font-serif text-5xl font-semibold tracking-tight sm:text-6xl dark:font-sans dark:text-4xl dark:sm:text-5xl">Danas</h1>
        <time dateTime={belgradeDayKey(now)} className="col-span-2 font-serif text-lg text-primary italic first-letter:uppercase sm:col-span-1 sm:text-2xl dark:font-sans dark:text-sm dark:text-muted-foreground dark:not-italic">
          {todayLabel}
        </time>
        <div className="col-start-2 row-start-1 justify-self-end sm:row-span-2"><DashboardQuickAdd /></div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<DashboardPanelLoading title="Prioritetni zadaci" />}>
          <TasksPanel now={now} />
        </Suspense>
        <Suspense fallback={<DashboardPanelLoading title="Današnji plan" />}>
          <CalendarPanel now={now} />
        </Suspense>
        <div className="grid min-w-0 items-start gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <Suspense fallback={<DashboardPanelLoading title="Navike" />}>
            <HabitsPanel now={now} />
          </Suspense>
          <Suspense fallback={<DashboardPanelLoading title="Finansijski ciljevi" />}>
            <GoalsPanel />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
