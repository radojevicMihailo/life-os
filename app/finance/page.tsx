import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { SourceBadge } from "@/modules/finance/ui/components/source-badge";
import { TransactionAmounts } from "@/modules/finance/ui/components/transaction-amounts";
import { getDashboard } from "@/modules/finance/read-models/dashboard";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";

function MetricCard({
  label,
  amount,
  detail,
}: {
  label: string;
  amount: string | null;
  detail: string;
}) {
  return (
    <article
      aria-describedby="valuation-sources"
      className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold text-white">
        {amount === null ? (
          "Nedostupno"
        ) : (
          <Money amount={amount} currencyCode="EUR" label={label} />
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export default async function DashboardPage() {
  const { dependencies, valuationOptions } = await loadReadModelRuntime();
  const dashboard = await getDashboard(dependencies, valuationOptions);

  return (
    <>
      <PageHeader eyebrow="Danas" title="Finansijski pregled">
        Sve zbirne vrednosti su izražene u EUR i zadržavaju vidljiv izvor,
        datum i status konverzije.
      </PageHeader>

      <section aria-label="Ključni pokazatelji" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          amount={dashboard.netWorth.amount}
          detail={dashboard.netWorth.complete ? "Kompletna procena" : "Nedostaje kurs ili cena"}
          label="Neto imovina"
        />
        <MetricCard amount={dashboard.totals.assetsEur} detail="Računi, potraživanja i portfolio" label="Aktiva" />
        <MetricCard amount={dashboard.totals.liabilitiesEur} detail="Obaveze umanjuju neto imovinu" label="Obaveze" />
        <MetricCard
          amount={dashboard.cashFlow.netEur}
          detail={`Prihodi ${dashboard.cashFlow.incomeEur ?? "—"} · Rashodi ${dashboard.cashFlow.expenseEur ?? "—"}`}
          label="Tok ovog meseca"
        />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Budžeti ovog meseca</h2>
            <span className="text-xs text-slate-500">{dashboard.budgets.length} kategorija</span>
          </div>
          {dashboard.budgets.length === 0 ? (
            <div className="mt-5"><EmptyState title="Nema budžeta za ovaj mesec" /></div>
          ) : (
            <ul className="mt-5 space-y-4">
              {dashboard.budgets.slice(0, 5).map((budget) => (
                <li className="rounded-2xl bg-slate-900/70 p-4" key={budget.categoryId}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{budget.categoryName}</p>
                    <Money amount={budget.remainingAmount} currencyCode={budget.currencyCode} label={`Preostalo za ${budget.categoryName}`} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Preneto {budget.carryInAmount} · Potrošeno {budget.spendingAmount} {budget.currencyCode}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Ciljevi</h2>
          {dashboard.goals.length === 0 ? (
            <div className="mt-5"><EmptyState title="Još nema aktivnih ciljeva" /></div>
          ) : (
            <ul className="mt-5 space-y-4">
              {dashboard.goals.slice(0, 4).map((goal) => (
                <li key={goal.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{goal.name}</span>
                    <span className="font-medium">{goal.percentage}%</span>
                  </div>
                  <div aria-label={`${goal.name}: ${goal.percentage}%`} className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Number(goal.percentage)}>
                    <div className="h-full rounded-full bg-teal-300" style={{ width: `${Math.min(100, Math.max(0, Number(goal.percentage)))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Nedavne transakcije</h2>
          {dashboard.recentTransactions.length === 0 ? (
            <div className="mt-5"><EmptyState title="Još nema transakcija" /></div>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {dashboard.recentTransactions.map((transaction) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={transaction.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{transaction.description ?? transaction.type}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.occurredAt.toLocaleDateString("sr-Latn-RS")} · {transaction.source}</p>
                  </div>
                  <TransactionAmounts amounts={transaction.nativeAmounts} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" id="valuation-sources">
          <h2 className="text-lg font-semibold">Poverenje u procenu</h2>
          {dashboard.valuationSources.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-400">Sve prikazane vrednosti su već u EUR ili trenutno nema podataka za konverziju.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {dashboard.valuationSources.map((source) => (
                <li className="flex flex-wrap items-center justify-between gap-3" key={`${source.source}-${source.effectiveAt.toISOString()}-${source.value}`}>
                  <SourceBadge metadata={source} />
                  <time className="text-xs text-slate-500" dateTime={source.effectiveAt.toISOString()}>{source.effectiveAt.toLocaleString("sr-Latn-RS")}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
