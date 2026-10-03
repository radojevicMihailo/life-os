import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";
import { SourceBadge } from "@/modules/finance/ui/components/source-badge";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { listGoals } from "@/modules/finance/read-models/goals";
import { getAccountPurposes } from "@/modules/finance/read-models/account-purposes";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { ArchiveGoalForm, GoalForm } from "./goal-forms";
import { GoalAllocationForm, ReleaseGoalAllocation } from "./goal-allocations";

export default async function GoalsPage() {
  const { dependencies, valuationOptions } = await loadReadModelRuntime();
  const [goals, options, purposes] = await Promise.all([
    listGoals(dependencies, valuationOptions), getMutationOptions(dependencies), getAccountPurposes(dependencies),
  ]);
  const accounts = options.accounts.filter((account) => account.isActive && account.classification === "asset")
    .map((account) => ({ ...account, free: purposes.summaries[account.id]?.free ?? "0" }));

  return <>
    <PageHeader eyebrow="Štednja" title="Ciljevi">Izdvoji novac za važne ciljeve sa više računa, u različitim valutama.</PageHeader>
    <div className="mb-6"><GoalForm currencies={options.currencies} /></div>
    {goals.items.length === 0 ? <EmptyState title="Još nema ciljeva">Napravi cilj, pa izaberi sa kojih računa izdvajaš sredstva.</EmptyState> : <div className="grid items-start gap-5 xl:grid-cols-2">
      {goals.items.map((goal) => <article className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5" key={goal.id} id={`goal-${goal.id}`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="break-words text-lg font-semibold">{goal.name}</h2><p className="mt-1 text-xs text-slate-500">{goal.allocations.length} {goal.allocations.length === 1 ? "račun" : "računa"} · cilj u {goal.currencyCode}{goal.isActive ? "" : " · Arhiviran"}</p></div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><Wallet className="size-5" /></span>
        </div>
        <GoalProgress name={goal.name} balance={goal.balance} percentage={goal.percentage} targetAmount={goal.targetAmount} currencyCode={goal.currencyCode} underfunded={goal.underfunded} stale={goal.stale} />
        {goal.legacyAccountName && !goal.allocations.length ? <p className="mt-4 rounded-xl bg-blue-400/10 p-3 text-xs text-blue-200">Ovaj cilj je ranije pratio ceo saldo računa „{goal.legacyAccountName}“. Izaberi koliko novca izdvajaš za cilj; saldo se više ne računa automatski.</p> : null}
        <section className="mt-5 space-y-3 border-t border-white/10 pt-4" aria-label={`Raspodela: ${goal.name}`}>
          <h3 className="text-sm font-semibold">Gde je novac</h3>
          {!goal.allocations.length ? <p className="text-sm text-slate-500">Još nema izdvojenih sredstava.</p> : <ul className="space-y-3">
            {goal.allocations.map((allocation) => <li className="rounded-2xl border border-white/10 p-3.5" key={`${allocation.id}-${allocation.amount}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href="/finance/accounts" className="min-w-0 break-words text-sm font-medium text-blue-200 hover:underline">{allocation.accountName}{allocation.accountActive ? "" : " · Arhiviran račun"}</Link>
                <Money amount={allocation.amount} currencyCode={allocation.currencyCode} label={`Izdvojeno sa računa ${allocation.accountName}`} />
              </div>
              {allocation.currencyCode !== goal.currencyCode ? <div className="mt-2 space-y-2 text-xs text-slate-400">
                <p>{allocation.convertedAmount === null ? "Nedostaje kurs za protivvrednost." : <>≈ <Money amount={allocation.convertedAmount} currencyCode={goal.currencyCode} label="Protivvrednost u valuti cilja" /></>}</p>
                {allocation.valuation.sourceToEur ? <p>Kurs: 1 {allocation.currencyCode} = {new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 8 }).format(Number(allocation.valuation.sourceToEur.value))} EUR</p> : null}
                {allocation.valuation.targetToEur ? <p>Kurs: 1 {goal.currencyCode} = {new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 8 }).format(Number(allocation.valuation.targetToEur.value))} EUR</p> : null}
                <div className="flex flex-wrap gap-2">{allocation.valuation.sourceToEur ? <SourceBadge metadata={allocation.valuation.sourceToEur} /> : null}{allocation.valuation.targetToEur ? <SourceBadge metadata={allocation.valuation.targetToEur} /> : null}</div>
                {allocation.valuation.missingCurrencies.length ? <p className="text-amber-300">Unesi kurs za {allocation.valuation.missingCurrencies.join(", ")} u <Link className="underline" href="/finance/settings">finansijskim podešavanjima</Link>.</p> : null}
                {allocation.valuation.stale ? <p className="text-amber-300">Procena koristi zastareo kurs.</p> : null}
              </div> : null}
              {allocation.underfunded ? <p className="mt-3 text-xs text-amber-300">Ukupne rezervacije na ovom računu premašuju saldo za <Money amount={allocation.accountDeficit} currencyCode={allocation.currencyCode} />. Preraspodeli rezervacije ili dopuni račun.</p> : null}
              <div className="mt-3 flex flex-wrap items-start gap-2">
                {goal.isActive && allocation.accountActive ? <details className="min-w-0 flex-1"><summary className="min-h-10 cursor-pointer py-2.5 text-xs text-slate-400">Izmeni iznos</summary>
                  <GoalAllocationForm goalId={goal.id} allocation={allocation} accounts={accounts.filter((account) => account.id === allocation.accountId)} />
                </details> : null}
                <ReleaseGoalAllocation id={allocation.id} accountId={allocation.accountId} name={allocation.accountName} />
              </div>
            </li>)}
          </ul>}
        </section>
        {goal.isActive ? <>
          <details className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/5 px-4">
            <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-medium text-blue-200"><Plus className="size-4" />Dodaj sredstva</summary>
            <div className="pb-4">
              <p className="mb-3 text-xs text-slate-500">Rezervacija označava namenu postojećeg novca; ne pomera sredstva između računa.</p>
              {accounts.some((account) => !goal.allocations.some((allocation) => allocation.accountId === account.id)) ? <GoalAllocationForm key={goal.allocations.map((allocation) => allocation.id).join(",")} goalId={goal.id} accounts={accounts.filter((account) => !goal.allocations.some((allocation) => allocation.accountId === account.id))} /> : <p className="text-sm text-slate-400">{accounts.length ? "Svi aktivni računi su već povezani. Za njih izaberi Izmeni iznos." : "Dodaj aktivan račun u Finansije → Računi."}</p>}
            </div>
          </details>
          <details className="mt-3"><summary className="min-h-10 cursor-pointer py-2.5 text-xs text-slate-400">Izmeni cilj</summary><GoalForm currencies={options.currencies} goal={goal} /></details>
          <ArchiveGoalForm id={goal.id} name={goal.name} />
        </> : null}
      </article>)}
    </div>}
  </>;
}
