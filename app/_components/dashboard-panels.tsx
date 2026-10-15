import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCheck, Landmark, Repeat2 } from "lucide-react";
import { FinancePrivacyToggle } from "@/modules/finance/ui/components/finance-privacy";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";
import { HabitTodayRow } from "@/app/habits/_components/HabitTodayRow";
import { belgradeDayKey } from "@/lib/day";
import { taskPriorityLabel } from "@/lib/task-priorities";
import { loadDashboardCalendar, loadDashboardGoals, loadDashboardHabits, loadDashboardTasks } from "../_lib/dashboard";
import { nextPlanItem } from "../_lib/dashboard-model";
import { DashboardTaskActions } from "./dashboard-task-actions";

function PanelHeading({ icon: Icon, title, href }: { icon: typeof Repeat2; title: string; href: string }) {
  return <div className="mb-5 flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></span><h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2></div>
    <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Vidi sve <ArrowRight className="size-3.5" /></Link>
  </div>;
}
function EmptyPanel({ children, href, action }: { children: string; href: string; action: string }) {
  return <div className="rounded-2xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground"><p>{children}</p><Link href={href} className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">{action} <ArrowRight className="size-4" /></Link></div>;
}
function PanelError({ href }: { href: string }) {
  return <p role="alert" className="text-sm text-muted-foreground">Podaci trenutno nisu dostupni. <Link href={href} className="text-primary underline">Otvori oblast i pokušaj ponovo.</Link></p>;
}
export function DashboardPanelLoading({ title }: { title: string }) {
  return <section aria-label={title} aria-busy="true" className="cockpit-card min-h-48 p-5 sm:p-6"><h2 className="text-lg font-semibold">{title}</h2><p role="status" className="mt-5 animate-pulse text-sm text-muted-foreground">Učitavanje…</p></section>;
}
export async function HabitsPanel({ now }: { now: Date }) {
  const habits = await loadDashboardHabits(now).catch(() => null);
  const content = habits === null ? <PanelError href="/habits" /> : habits.length === 0 ? <EmptyPanel href="/habits/new" action="Dodaj naviku">Još nema navika za danas.</EmptyPanel> : <div className="space-y-2">{habits.map(({ habit, count }) => <HabitTodayRow key={`${habit.id}:${belgradeDayKey(now)}:${count}`} habit={habit} count={count} streak={0} showStreak={false} isoToday={belgradeDayKey(now)} />)}</div>;
  return <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Navike"><PanelHeading icon={Repeat2} title="Današnje navike" href="/habits" />{content}</section>;
}
export async function GoalsPanel() {
  const goals = await loadDashboardGoals().catch(() => null);
  const content = goals === null ? <PanelError href="/finance/goals" /> : goals.length === 0 ? <EmptyPanel href="/finance/goals" action="Postavi cilj">Još nema aktivnih finansijskih ciljeva.</EmptyPanel> : <ul className="space-y-3">{goals.map((goal) => <li className="min-w-0 rounded-2xl border border-border bg-background/30 p-3.5" key={goal.id}><div className="mb-3 truncate text-sm font-medium" title={goal.name}>{goal.name}</div><GoalProgress name={goal.name} balance={goal.balance} percentage={goal.percentage} targetAmount={goal.targetAmount} currencyCode={goal.currencyCode} underfunded={goal.underfunded} stale={goal.stale} /></li>)}</ul>;
  return <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Finansijski ciljevi"><PanelHeading icon={Landmark} title="Finansijski ciljevi" href="/finance/goals" /><div className="mb-4 flex justify-end"><FinancePrivacyToggle /></div>{content}</section>;
}
export async function TasksPanel({ now }: { now: Date }) {
  const tasks = await loadDashboardTasks(now).catch(() => null);
  const content = tasks === null ? <PanelError href="/tasks" /> : tasks.length === 0 ? <EmptyPanel href="/tasks" action="Dodaj zadatak">Nema aktivnih zadataka za danas.</EmptyPanel> : <ol className="space-y-3">{tasks.map((task) => <li key={task.id} className="rounded-2xl border border-border p-3.5"><Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:text-primary">{task.title}</Link><div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">{task.priority && <span>{taskPriorityLabel(task.priority)}</span>}{task.dueAt && <span>Rok: {new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", day: "numeric", month: "short" }).format(task.dueAt)}</span>}</div><DashboardTaskActions id={task.id} title={task.title} actionAt={task.actionAt?.toISOString() ?? null} actionEndAt={task.actionEndAt?.toISOString() ?? null} /></li>)}</ol>;
  return <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Prioritetni zadaci"><PanelHeading icon={CheckCheck} title="Tri najvažnija zadatka" href="/tasks" />{content}</section>;
}
export async function CalendarPanel({ now }: { now: Date }) {
  const data = await loadDashboardCalendar(now).catch(() => null);
  const { plan, calendarError } = data ?? { plan: [], calendarError: null };
  const next = nextPlanItem(plan, now);
  const time = (date: string) => new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
  const content = data === null ? <PanelError href="/calendar" /> : <>
      {calendarError && <p role="status" className="mb-4 text-xs text-amber-700 dark:text-amber-300">Google kalendar trenutno nije dostupan. Prikazane su zakazane aktivnosti iz aplikacije.</p>}
      {next && <Link href={next.href} className="mb-4 block rounded-xl bg-primary/10 p-4"><p className="text-xs font-medium text-primary">{new Date(next.startsAt) <= now ? "U toku" : "Sledeće na redu"}</p><p className="mt-1 text-sm font-semibold">{next.title}</p><p className="mt-1 text-xs text-muted-foreground">{time(next.startsAt)}{new Date(next.startsAt) > now && ` · za ${Math.ceil((new Date(next.startsAt).getTime() - now.getTime()) / 60000)} min`}</p></Link>}
      {plan.length === 0 ? <EmptyPanel href="/calendar" action="Otvori kalendar">Danas nema zakazanih aktivnosti.</EmptyPanel> : <ol className="space-y-1">{plan.slice(0, 8).map((item) => <li key={item.id}><Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm hover:bg-accent/50"><time className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{item.allDay ? "Ceo dan" : time(item.startsAt)}</time><span className="truncate font-medium" title={item.title}>{item.title}</span></Link></li>)}</ol>}
    </>;
  return <section className="cockpit-card min-w-0 p-5 sm:p-6" aria-label="Današnji plan"><PanelHeading icon={CalendarDays} title="Današnji plan" href="/calendar" />{content}</section>;
}
