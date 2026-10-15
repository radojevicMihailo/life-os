import { parsePlanningHorizon } from "@/modules/finance/ui/forms/planning";
import { getAvailableCash } from "@/modules/finance/read-models/available-cash";
import { AvailableCash } from "@/modules/finance/ui/components/available-cash";
import { addDays } from "@/modules/finance/domain/calendar";
import Link from "next/link";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { listPlanning } from "@/modules/finance/read-models/planning";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { listTransactions } from "@/modules/finance/read-models/transactions";
import { todayBelgrade, monthEnd } from "@/modules/finance/domain/calendar";
import { isSupportedBudgetMonth } from "@/modules/finance/domain/budgets";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { Money } from "@/modules/finance/ui/components/money";
import { PlanForm, OccurrenceForms, ArchivePlanForm } from "./planning-forms";
export default async function PlanningPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { dependencies } = await loadReadModelRuntime(), params = await searchParams, today = todayBelgrade(dependencies.clock.now());
    const raw = typeof params.month === "string" ? params.month : undefined, month = raw && isSupportedBudgetMonth(raw) ? raw : today.slice(0, 7);
    const [view, options, transactions] = await Promise.all([listPlanning(dependencies, { from: `${month}-01`, to: monthEnd(`${month}-01`) }), getMutationOptions(dependencies), listTransactions(dependencies, { limit: 200 })]);
    const { endDate, error: horizonError } = parsePlanningHorizon(params.endDate, today);
    const cash = await getAvailableCash(dependencies, { endDate });
    const status = { pending: "Čeka potvrdu", confirmed: "Potvrđeno", skipped: "Preskočeno" };
    return <><PageHeader eyebrow="Plan" title="Prihodi i obaveze">Planirane stavke menjaju stvarni saldo tek kada potvrdiš plaćanje ili ih povežeš sa postojećom transakcijom.</PageHeader>
 <AvailableCash view={cash}/><form className="mb-6 flex flex-wrap items-end gap-3"><input type="hidden" name="month" value={month}/><label>Planiraj potrošnju do<input className="block min-h-11 rounded-xl bg-slate-900 px-3" type="date" name="endDate" min={today} max={addDays(today, 366)} aria-invalid={!!horizonError} aria-describedby={horizonError ? "horizon-error" : undefined} defaultValue={cash.endDate}/></label><button className="min-h-11 px-4 border border-white/10 rounded-xl">Izračunaj</button></form>
 {horizonError ? <p id="horizon-error" role="alert" className="mb-4 text-sm text-amber-300">{horizonError}</p> : null}
 <PlanForm accounts={options.accounts} categories={options.categories} today={today}/>
 <form className="my-6 flex items-end gap-3"><label>Mesec<input className="block min-h-11 rounded-xl bg-slate-900 px-3" type="month" name="month" defaultValue={month}/></label><button className="min-h-11 px-4 rounded-xl border border-white/10">Prikaži</button></form>
 <div className="space-y-4">{view.occurrences.map(item => <article key={`${item.ruleId}-${item.dueDate}`} className="rounded-2xl border border-white/10 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="text-sm text-slate-400">{item.dueDate} · {item.accountName} · {item.categoryName}</p></div><Money amount={item.amount} currencyCode={item.currencyCode}/></div><p className={item.status === "pending" && item.overdue ? "text-amber-300 text-sm mt-2" : "text-slate-400 text-sm mt-2"}>{status[item.status]}{item.status === "pending" && item.overdue ? " · Dospelo" : ""}</p>{item.status === "pending" ? <OccurrenceForms item={item} today={today} transactions={transactions.items.filter(t => t.type === item.type && t.accountNames.includes(item.accountName) && t.categoryNames.includes(item.categoryName)).map(t => ({ id: t.id, label: `${t.occurredAt.toLocaleDateString("sr-Latn-RS")} · ${t.description ?? item.name} · ${t.nativeAmounts.map(a => `${a.amount} ${a.currencyCode}`).join(" / ")}` }))}/> : item.journalTransactionId ? <Link className="text-sm text-blue-200" href={`/finance/transactions?q=${encodeURIComponent(item.name)}`}>Pogledaj promet</Link> : null}</article>)}</div>
 {!view.occurrences.length ? <p className="py-5 text-slate-400">Nema planiranih stavki za izabrani mesec.</p> : null}
 <section className="mt-8 space-y-3"><h2 className="text-lg font-semibold">Pravila ponavljanja</h2>{view.rules.filter(r => !r.archivedAt).map(rule => <details key={rule.id} className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer py-2">{rule.name} · {rule.accountName}</summary><PlanForm rule={rule} accounts={options.accounts} categories={options.categories} today={today}/><div className="mt-3"><ArchivePlanForm id={rule.id}/></div></details>)}</section>
 </>;
}
