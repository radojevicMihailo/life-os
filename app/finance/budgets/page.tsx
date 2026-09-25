import Decimal from "decimal.js";

import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { listBudgets } from "@/modules/finance/read-models/budgets";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { BudgetForm } from "./budget-form";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const month = first(params.month);
  const { dependencies } = await loadReadModelRuntime();
  const [budgets, options] = await Promise.all([
    listBudgets(dependencies, { month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "") ? month : undefined }),
    getMutationOptions(dependencies),
  ]);

  return <><PageHeader eyebrow="Plan potrošnje" title="Budžeti">Limit, preneti saldo i prihvatljiva potrošnja prikazani su zasebno.</PageHeader><BudgetForm categories={options.categories} currencies={options.currencies} month={budgets.month} /><form className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4" method="get"><label className="text-xs text-slate-400">Mesec<input className="mt-1 min-h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={budgets.month} name="month" type="month" /></label><button className="min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950" type="submit">Prikaži</button></form>{budgets.items.length === 0 ? <EmptyState title="Nema budžeta za izabrani mesec" /> : <div className="grid gap-4 lg:grid-cols-2">{budgets.items.map((budget) => { const available = new Decimal(budget.availableAmount); const spending = new Decimal(budget.spendingAmount); const used = available.isZero() ? 0 : Math.min(100, Math.max(0, spending.div(available).times(100).toNumber())); return <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" key={budget.categoryId}><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-semibold">{budget.categoryName}</h2><Money amount={budget.remainingAmount} currencyCode={budget.currencyCode} label="Preostali budžet" /></div><div aria-label={`Potrošeno ${used.toFixed(0)} procenata`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={used} className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar"><div className="h-full rounded-full bg-teal-300" style={{ width: `${used}%` }} /></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-slate-500">Limit</dt><dd className="mt-1">{budget.limitAmount} {budget.currencyCode}</dd></div><div><dt className="text-xs text-slate-500">Preneto</dt><dd className="mt-1">{budget.carryInAmount} {budget.currencyCode}</dd></div><div><dt className="text-xs text-slate-500">Potrošeno</dt><dd className="mt-1">{budget.spendingAmount} {budget.currencyCode}</dd></div><div><dt className="text-xs text-slate-500">Dostupno</dt><dd className="mt-1">{budget.availableAmount} {budget.currencyCode}</dd></div></dl></article>; })}</div>}</>;
}
