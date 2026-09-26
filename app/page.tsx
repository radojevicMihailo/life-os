import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Circle, Landmark, Repeat2 } from "lucide-react";
import { Money } from "@/modules/finance/ui/components/money";
import { loadHomeDashboard } from "./_lib/dashboard";

export const dynamic = "force-dynamic";

function PanelHeading({ icon: Icon, title, href }: { icon: typeof Repeat2; title: string; href: string }) {
  return <div className="mb-6 flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></span><h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2></div>
    <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Vidi sve <ArrowRight className="size-3.5" /></Link>
  </div>;
}

function EmptyPanel({ children, href, action }: { children: string; href: string; action: string }) {
  return <div className="rounded-2xl border border-dashed border-border px-5 py-7 text-sm text-muted-foreground">
    <p>{children}</p><Link href={href} className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">{action} <ArrowRight className="size-4" /></Link>
  </div>;
}

export default async function Home() {
  const dashboard = await loadHomeDashboard();
  const completedHabits = dashboard.habits.filter((item) => item.completed).length;
  const habitProgress = dashboard.habits.length === 0 ? 0 : Math.round(completedHabits / dashboard.habits.length * 100);
  const todayLabel = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Belgrade" }).format(new Date(dashboard.date));

  return <div className="space-y-5 pb-8">
    <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-blue-400/20 bg-[#07152b] px-5 pb-6 pt-7 text-white shadow-[0_25px_75px_rgba(0,0,0,0.18)] sm:px-8 sm:pb-8 lg:min-h-[260px] lg:px-10">
      <div aria-hidden className="absolute inset-0 -z-20 bg-[url('/images/home-hero.webp')] bg-cover bg-[55%_center] opacity-70" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061020] via-[#061020]/75 to-[#061020]/15" />
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl"><p className="text-sm text-blue-200">{todayLabel}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Danas</h1><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Danas biram <span className="text-cyan-300">napredak.</span></p></div>
        <p className="max-w-[15rem] text-right text-2xl font-semibold italic leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-3xl">Bolja verzija mene.<br /><span className="text-cyan-300">Svaki dan.</span></p>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-2 sm:mt-10"><span className="mr-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Fokus za danas</span>{["Budi dosledan", "Ostani u balansu", "Uživaj u procesu"].map((focus) => <span key={focus} className="rounded-full border border-blue-400/35 bg-[#091b38]/75 px-4 py-2 text-xs font-medium text-blue-50 backdrop-blur-sm"><span className="mr-2 text-cyan-300">✦</span>{focus}</span>)}</div>
    </header>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Navike">
        <PanelHeading icon={Repeat2} title="Navike" href="/habits" />
        {dashboard.habits.length === 0 ? <EmptyPanel href="/habits/new" action="Dodaj naviku">Još nema navika za danas.</EmptyPanel> : <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative flex size-36 shrink-0 items-center justify-center rounded-full p-3" style={{ background: `conic-gradient(#25c6ff ${habitProgress}%, #1b3659 ${habitProgress}%)` }}><div className="flex size-full flex-col items-center justify-center rounded-full bg-card"><span className="text-3xl font-semibold tabular-nums">{completedHabits}/{dashboard.habits.length}</span><span className="text-xs text-muted-foreground">danas</span></div></div>
          <ul className="grid min-w-0 flex-1 gap-2 sm:grid-cols-1 2xl:grid-cols-2">{dashboard.habits.slice(0, 6).map((item) => <li key={item.id} className="flex min-w-0 items-center gap-2 text-sm"><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${item.completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/70 text-muted-foreground"}`}>{item.completed ? <Check className="size-3.5" /> : null}</span><span className="truncate" title={item.title}>{item.title}</span><span className="sr-only">{item.completed ? "Završeno" : "Nije završeno"}</span></li>)}</ul>
        </div>}
      </section>

      <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Finansijski ciljevi">
        <PanelHeading icon={Landmark} title="Finansijski ciljevi" href="/finance/goals" />
        {dashboard.goals.length === 0 ? <EmptyPanel href="/finance/goals" action="Postavi cilj">Još nema aktivnih finansijskih ciljeva.</EmptyPanel> : <ul className="space-y-3">{dashboard.goals.map((goal) => { const percentage = Math.min(100, Math.max(0, Number(goal.percentage))); return <li className="min-w-0 rounded-2xl border border-border bg-background/30 p-3.5" key={goal.id}><div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-sm"><span className="min-w-0 truncate font-medium" title={goal.name}>{goal.name}</span><span className="min-w-0 break-words text-xs tabular-nums text-muted-foreground"><Money amount={goal.balance} currencyCode={goal.currencyCode} /> / <Money amount={goal.targetAmount} currencyCode={goal.currencyCode} /></span></div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-label={`${goal.name}: ${percentage.toFixed(0)}%`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} role="progressbar"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${percentage}%` }} /></div><span className="w-10 text-right text-xs font-semibold tabular-nums text-blue-700 dark:text-cyan-300">{percentage.toFixed(0)}%</span></div></li>; })}</ul>}
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
      <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Današnji plan">
        <PanelHeading icon={CalendarDays} title="Današnji plan" href="/calendar" />
        {dashboard.calendarError ? <p className="mb-4 text-xs text-amber-700 dark:text-amber-300">Google kalendar trenutno nije dostupan. Prikazane su zakazane aktivnosti iz aplikacije.</p> : null}
        {dashboard.plan.length === 0 ? <EmptyPanel href="/calendar" action="Otvori kalendar">Danas nema zakazanih aktivnosti.</EmptyPanel> : <ol className="space-y-1">{dashboard.plan.map((item) => <li key={item.id}><Link href={item.href} className="group grid grid-cols-[4.5rem_1rem_minmax(0,1fr)] items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[5rem_1rem_minmax(0,1fr)_4rem]"><time className="text-xs tabular-nums text-muted-foreground">{item.allDay ? "Ceo dan" : item.ongoing ? "U toku" : new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt))}</time><Circle className="size-2.5 fill-primary text-primary" /><span className="min-w-0 truncate font-medium group-hover:text-primary" title={item.title}>{item.title}</span><span className="hidden text-right text-xs text-muted-foreground sm:block">{item.source === "google" ? "Google" : "Zadatak"}</span></Link></li>)}</ol>}
      </section>
      <aside className="cockpit-card flex min-h-48 flex-col justify-center p-6 sm:p-8"><span className="mb-5 h-0.5 w-12 bg-cyan-400" /><p className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Mali koraci,<br /><span className="text-blue-700 dark:text-cyan-300">velike promene.</span></p></aside>
    </div>
  </div>;
}
