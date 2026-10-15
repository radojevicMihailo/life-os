import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { getMonthlyReports } from "@/modules/finance/read-models/reports";
import { isSupportedBudgetMonth } from "@/modules/finance/domain/budgets";
import { todayBelgrade } from "@/modules/finance/domain/calendar";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { Money } from "@/modules/finance/ui/components/money";
import { FinancialValue, FinancialDetail } from "@/modules/finance/ui/components/finance-privacy";
import { MonthlyChart } from "./monthly-chart";
function Value({ amount }: {
    amount: string | null;
}) { return amount === null ? <span className="text-amber-300">Nedostupno</span> : <Money amount={amount} currencyCode="EUR"/>; }
export default async function ReportsPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { dependencies, valuationOptions } = await loadReadModelRuntime(), params = await searchParams, today = todayBelgrade(dependencies.clock.now());
    const month = typeof params.month === "string" && isSupportedBudgetMonth(params.month) ? params.month : today.slice(0, 7), view = await getMonthlyReports(dependencies, { month, months: 12 }, valuationOptions), current = view.points.at(-1)!;
    const metrics = [["Prihodi", current.incomeEur], ["Rashodi (sa naknadama)", current.expenseEur], ["Višak / manjak", current.netEur], ["Neto imovina", current.netWorthEur], ["Nove kupovine investicija", current.investmentBuysEur], ["Prodaje investicija", current.investmentSalesEur], ["Tržišni efekat", current.marketEffectEur], ["Valutni efekat", current.fxEffectEur], ["Početna stanja i ostale promene kapitala", current.adjustmentsEur], ["Promena neto imovine", current.netWorthChangeEur]];
    return <><PageHeader eyebrow="Napredak" title="Mesečni izveštaji">Istorijski obračun koristi tada dostupne kurseve i cene. Praznine označavaju nedostajuće podatke.</PageHeader>
 <form className="mb-6 flex items-end gap-3"><label>Mesec<input type="month" name="month" max={today.slice(0, 7)} defaultValue={current.month} className="mt-1 block min-h-11 rounded-xl bg-slate-900 px-3"/></label><button className="min-h-11 rounded-xl border border-white/10 px-4">Prikaži</button></form>
 {current.inProgress ? <p className="mb-4 text-sm text-blue-200">Mesec u toku — presek do danas.</p> : null}
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, amount]) => <article key={label} className="rounded-2xl border border-white/10 p-5"><h2 className="text-sm text-slate-400">{label}</h2><p className="mt-3 text-xl"><Value amount={amount}/></p></article>)}<article className="rounded-2xl border border-white/10 p-5"><h2 className="text-sm text-slate-400">Stopa štednje</h2><p className="mt-3 text-xl"><FinancialValue>{current.savingsRate === null ? "Nedostupno" : `${Number(current.savingsRate).toFixed(1)}%`}</FinancialValue></p></article></div>
 <FinancialDetail>{current.stale ? <p className="mt-5 text-sm text-amber-300">Deo procene koristi zastarele istorijske kurseve ili cene.</p> : null}{current.unattributedEur !== null && Math.abs(Number(current.unattributedEur)) > 0.005 ? <p className="mt-4 text-sm text-amber-300">Preostala neraspoređena razlika: <Value amount={current.unattributedEur}/>. Ova razlika nije prikazana kao tržišni prinos.</p> : null}</FinancialDetail>
 <section className="mt-6 rounded-2xl border border-white/10 p-4 sm:p-5"><h2 className="mb-4 font-semibold">Neto imovina kroz vreme</h2><MonthlyChart points={view.points.map(p => ({ month: p.month, netWorthEur: p.netWorthEur }))}/></section>
 <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-sm text-left"><caption className="p-4 text-left font-semibold">Poslednjih 12 meseci · EUR</caption><thead className="text-slate-400"><tr>{["Mesec", "Prihodi", "Rashodi", "Višak / manjak", "Stopa štednje", "Neto imovina"].map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{view.points.map(p => <tr key={p.month} className="border-t border-white/10"><td className="p-3 whitespace-nowrap">{p.month}{p.stale ? " · zastarelo" : ""}</td><td className="p-3"><Value amount={p.incomeEur}/></td><td className="p-3"><Value amount={p.expenseEur}/></td><td className="p-3"><Value amount={p.netEur}/></td><td className="p-3"><FinancialValue>{p.savingsRate === null ? "—" : `${Number(p.savingsRate).toFixed(1)}%`}</FinancialValue></td><td className="p-3"><Value amount={p.netWorthEur}/></td></tr>)}</tbody></table></section>
 <section className="mt-6"><h2 className="font-semibold">Pokrivenost istorijskih podataka</h2><ul className="mt-3 space-y-3">{view.points.filter(p => p.missingSources.length).map(p => <li key={p.month} className="rounded-xl bg-amber-300/10 p-3 text-sm"><p>{p.month}</p><ul className="mt-2 text-amber-200">{p.missingSources.map(source => <li key={source}>{source}</li>)}</ul></li>)}</ul>{view.points.every(p => !p.missingSources.length) ? <p className="mt-3 text-sm text-slate-400">Nema nedostajućih izvora za prikazane obračune.</p> : null}</section>
 </>;
}
