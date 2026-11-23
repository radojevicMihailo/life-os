import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FinancePrivacyToggle } from "@/modules/finance/ui/components/finance-privacy";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";
import { HabitTodayRow } from "@/app/habits/_components/HabitTodayRow";
import { belgradeDayKey } from "@/lib/day";
import { taskPriorityLabel } from "@/lib/task-priorities";
import { loadDashboardCalendar, loadDashboardGoals, loadDashboardHabits, loadDashboardTasks } from "../_lib/dashboard";
import { nextPlanItem } from "../_lib/dashboard-model";
import { DashboardTaskActions } from "./dashboard-task-actions";

const panelClass = "today-panel min-w-0 dark:rounded-xl dark:border dark:border-border dark:bg-card";
const panelTitleClass = "font-serif text-xl font-semibold tracking-tight sm:text-2xl dark:font-sans dark:text-base dark:sm:text-lg";
const panelListClass = "not-dark:divide-y not-dark:divide-border/60 dark:space-y-2";
const timeFormat = new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit" });
const dueDateFormat = new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", day: "numeric", month: "short" });

function PanelHeading({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/80 pb-1 dark:mb-3 dark:border-0 dark:pb-0">
      <h2 className={panelTitleClass}>{title}</h2>
      <Link href={href} aria-label={`Vidi sve: ${title}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function EmptyPanel({ children, href, action }: { children: string; href: string; action: string }) {
  return (
    <div className="py-2 text-sm text-muted-foreground dark:rounded-lg dark:border dark:border-dashed dark:border-border dark:px-3 dark:py-4">
      <p>{children}</p>
      <Link href={href} className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">{action} <ArrowRight aria-hidden className="size-4" /></Link>
    </div>
  );
}

function PanelError({ href }: { href: string }) {
  return <p role="alert" className="text-sm text-muted-foreground">Podaci trenutno nisu dostupni. <Link href={href} className="text-primary underline">Otvori oblast i pokušaj ponovo.</Link></p>;
}

export function DashboardPanelLoading({ title }: { title: string }) {
  return (
    <section aria-label={title} aria-busy="true" className={panelClass}>
      <h2 className={panelTitleClass}>{title}</h2>
      <p role="status" className="mt-4 text-sm text-muted-foreground motion-safe:animate-pulse">Učitavanje…</p>
    </section>
  );
}

export async function HabitsPanel({ now }: { now: Date }) {
  const habits = await loadDashboardHabits(now).catch(() => null);
  const dayKey = belgradeDayKey(now);
  return (
    <section className={panelClass} aria-label="Navike">
      <PanelHeading title="Navike" href="/habits" />
      {habits === null ? <PanelError href="/habits" /> : habits.length === 0 ? (
        <EmptyPanel href="/habits/new" action="Dodaj naviku">Još nema navika za danas.</EmptyPanel>
      ) : (
        <ul className={panelListClass}>
          {habits.map(({ habit, count }) => (
            <li key={`${habit.id}:${dayKey}:${count}`}>
              <HabitTodayRow habit={habit} count={count} streak={0} showStreak={false} isoToday={dayKey} className="rounded-none border-0 bg-transparent px-1 shadow-none dark:rounded-lg dark:border dark:bg-secondary dark:px-3" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function GoalsPanel() {
  const goals = await loadDashboardGoals().catch(() => null);
  return (
    <section className={panelClass} aria-label="Finansijski ciljevi">
      <PanelHeading title="Finansijski ciljevi" href="/finance/goals" />
      {goals === null ? <PanelError href="/finance/goals" /> : goals.length === 0 ? (
        <EmptyPanel href="/finance/goals" action="Postavi cilj">Još nema aktivnih finansijskih ciljeva.</EmptyPanel>
      ) : (
        <ul className={panelListClass}>
          {goals.map((goal) => (
            <li className="min-w-0 px-1 py-2.5 dark:rounded-lg dark:border dark:border-border dark:bg-secondary dark:p-3" key={goal.id}>
              <h3 className="mb-2 break-words text-sm font-medium">{goal.name}</h3>
              <GoalProgress name={goal.name} balance={goal.balance} percentage={goal.percentage} targetAmount={goal.targetAmount} currencyCode={goal.currencyCode} underfunded={goal.underfunded} stale={goal.stale} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-end"><FinancePrivacyToggle /></div>
    </section>
  );
}

export async function TasksPanel({ now }: { now: Date }) {
  const tasks = await loadDashboardTasks(now).catch(() => null);
  return (
    <section className={panelClass} aria-label="Prioritetni zadaci">
      <PanelHeading title="Prioritetni zadaci" href="/tasks" />
      {tasks === null ? <PanelError href="/tasks" /> : tasks.length === 0 ? (
        <EmptyPanel href="/tasks?new=1" action="Dodaj zadatak">Nema aktivnih zadataka za danas.</EmptyPanel>
      ) : (
        <ol className={panelListClass}>
          {tasks.map((task) => (
            <li key={task.id} className="py-1 dark:rounded-lg dark:border dark:border-border dark:bg-secondary dark:px-2 dark:py-1.5 dark:sm:p-2.5">
              <DashboardTaskActions id={task.id} title={task.title} actionAt={task.actionAt?.toISOString() ?? null} actionEndAt={task.actionEndAt?.toISOString() ?? null}>
                <Link href={`/tasks/${task.id}`} className="block break-words text-sm font-medium hover:text-primary">{task.title}</Link>
                {(task.priority || task.dueAt) && (
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {task.priority && <span>{taskPriorityLabel(task.priority)}</span>}
                    {task.dueAt && <span>Rok: {dueDateFormat.format(task.dueAt)}</span>}
                  </div>
                )}
              </DashboardTaskActions>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export async function CalendarPanel({ now }: { now: Date }) {
  const data = await loadDashboardCalendar(now).catch(() => null);
  const next = data ? nextPlanItem(data.plan, now) : undefined;
  const remaining = data?.plan.filter((item) => item.id !== next?.id).slice(0, next ? 7 : 8) ?? [];

  return (
    <section className={panelClass} aria-label="Današnji plan">
      <PanelHeading title="Današnji plan" href="/calendar" />
      {data === null ? <PanelError href="/calendar" /> : (
        <>
          {data.calendarError && <p role="status" className="mb-3 text-xs text-amber-700 dark:text-amber-300">Google kalendar trenutno nije dostupan. Prikazane su zakazane aktivnosti iz aplikacije.</p>}
          {next && (
            <Link href={next.href} className="mb-2 block rounded-md border-s-2 border-chart-1 bg-accent px-3 py-2.5 hover:bg-accent/80">
              <p className="text-xs font-medium text-primary">{new Date(next.startsAt) <= now ? "U toku" : "Sledeći događaj"}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm">
                <time dateTime={next.startsAt} className="tabular-nums text-muted-foreground">{timeFormat.format(new Date(next.startsAt))}</time>
                <span className="min-w-0 break-words font-semibold">{next.title}</span>
              </p>
            </Link>
          )}
          {data.plan.length === 0 ? (
            <EmptyPanel href="/calendar" action="Otvori kalendar">Nema zakazanih termina za danas.</EmptyPanel>
          ) : remaining.length > 0 && (
            <ol className="divide-y divide-border">
              {remaining.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="grid min-h-11 grid-cols-[3.75rem_minmax(0,1fr)] items-baseline gap-2 rounded-md px-2 py-2.5 text-sm hover:bg-accent/50">
                    {item.allDay ? <span className="text-xs text-muted-foreground">Ceo dan</span> : <time dateTime={item.startsAt} className="text-xs tabular-nums text-muted-foreground">{timeFormat.format(new Date(item.startsAt))}</time>}
                    <span className="break-words font-medium">{item.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
