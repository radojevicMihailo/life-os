import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { listGoals } from "@/modules/finance/read-models/goals";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { ArchiveGoalForm, GoalForm } from "./goal-forms";

export default async function GoalsPage() {
  const { dependencies } = await loadReadModelRuntime();
  const [goals, options] = await Promise.all([listGoals(dependencies), getMutationOptions(dependencies)]);
  return <><PageHeader eyebrow="Štednja" title="Ciljevi">Napredak se izvodi direktno iz salda povezanog aktivnog računa.</PageHeader><div className="mb-6"><GoalForm accounts={options.accounts} /></div>{goals.items.length === 0 ? <EmptyState title="Još nema ciljeva" /> : <div className="grid gap-4 lg:grid-cols-2">{goals.items.map((goal) => { const percentage = Number(goal.percentage); return <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" key={goal.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{goal.name}</h2><p className="mt-1 text-xs text-slate-500">{goal.accountName}{goal.isActive ? "" : " · Arhiviran"}</p></div><p className="text-xl font-semibold">{goal.percentage}%</p></div><div aria-label={`${goal.name}: ${goal.percentage}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percentage} className="mt-5 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar"><div className="h-full rounded-full bg-teal-300" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div><div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><span><Money amount={goal.balance} currencyCode={goal.currencyCode} label="Trenutno" /></span><span className="text-slate-400">cilj <Money amount={goal.targetAmount} currencyCode={goal.currencyCode} label="Cilj" /></span></div>{goal.isActive ? <><div className="mt-4"><GoalForm accounts={options.accounts} goal={goal} /></div><ArchiveGoalForm id={goal.id} name={goal.name} /></> : null}</article>; })}</div>}</>;
}
