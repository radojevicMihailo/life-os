import { FinancialValue } from "@/modules/finance/ui/components/finance-privacy";
import { cookies } from "next/headers";
import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { SourceBadge } from "@/modules/finance/ui/components/source-badge";
import { listInvestments } from "@/modules/finance/read-models/investments";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { InvestmentAccountForm, InvestmentActivityForm, OpeningSetup, ResolveInstrumentForm } from "./investment-forms";
import { InvestmentGuide } from "./investment-guide";
import { InvestmentCorrectionForm } from "./investment-correction-form";

function EurValue({ amount }: { amount: string | null }) {
  return amount === null ? (
    <span className="text-sm text-amber-200">Nedostaje procena</span>
  ) : (
    <Money amount={amount} currencyCode="EUR" />
  );
}

export default async function InvestmentsPage() {
  const openingSetupHidden = (await cookies()).get("finance-opening-setup-hidden")?.value === "1";
  const { dependencies, valuationOptions } = await loadReadModelRuntime();
  const [investments, options] = await Promise.all([
    listInvestments(dependencies, valuationOptions),
    getMutationOptions(dependencies),
  ]);
  const metrics: Array<{ label: string; amount: string | null }> = [
    { label: "Tržišna vrednost", amount: investments.totals.marketValueEur },
    { label: "Otvorena osnovica", amount: investments.totals.costBasisEur },
    {
      label: "Nerealizovani rezultat",
      amount: investments.totals.unrealizedReturnEur,
    },
    {
      label: "Realizovani rezultat",
      amount: investments.totals.realizedReturnEur,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <PageHeader eyebrow="Portfolio" title="Investicije">
          Pozicije, FIFO lotovi i aktivnost sa odvojenim tržišnim i troškovnim
          vrednostima.
        </PageHeader>
        <div className="mb-6 sm:mt-8"><InvestmentGuide /></div>
      </div>
      <section className="grid gap-4 xl:grid-cols-2"><InvestmentAccountForm accounts={options.accounts} /><ResolveInstrumentForm /></section>
      <OpeningSetup initiallyHidden={openingSetupHidden} currencies={options.currencies} instruments={options.instruments} investmentAccounts={options.investmentAccounts} />
      <div className="my-6"><InvestmentActivityForm instruments={options.instruments} investmentAccounts={options.investmentAccounts} /></div>
      <section
        aria-label="Portfolio zbir"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map(({ label, amount }) => (
          <article
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
            key={label}
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold">
              {label.includes("rezultat") ? (
                <span className="sr-only">Dobitak ili gubitak: </span>
              ) : null}
              <EurValue amount={amount} />
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Pozicije</h2>
        {investments.positions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nema otvorenih pozicija" />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {investments.positions.map((position) => (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                key={`${position.investmentAccountId}-${position.instrumentId}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{position.symbol}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {position.name} · {position.accountName}{position.exchange ? ` · ${position.exchange}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="mb-1 text-[0.65rem] uppercase tracking-wide text-slate-500">Cena</p>
                      {position.quote ? (
                        <SourceBadge metadata={position.quote} />
                      ) : (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                          Nedostaje cena
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-[0.65rem] uppercase tracking-wide text-slate-500">EUR kurs</p>
                      {position.reportingFx ? (
                        <SourceBadge metadata={position.reportingFx} />
                      ) : (
                        <span className="text-xs text-amber-200">Nedostaje kurs</span>
                      )}
                    </div>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Količina</dt>
                    <dd className="mt-1 tabular-nums"><FinancialValue>{position.quantity}</FinancialValue></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Tržišna vrednost</dt>
                    <dd className="mt-1">
                      {position.marketValue === null ? (
                        "Nedostupno"
                      ) : (
                        <Money
                          amount={position.marketValue}
                          currencyCode={position.marketValueCurrencyCode}
                        />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Vrednost u EUR</dt>
                    <dd className="mt-1">
                      <EurValue amount={position.marketValueEur} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Nerealizovani rezultat</dt>
                    <dd className="mt-1">
                      <span className="sr-only">Dobitak ili gubitak: </span>
                      <EurValue amount={position.unrealizedReturnEur} />
                    </dd>
                  </div>
                </dl>
                <details className="mt-4 border-t border-white/10 pt-2">
                  <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium text-blue-200">Izmeni poziciju</summary>
                  <p className="mt-1 text-xs text-slate-400">Izaberi unos koji želiš da ispraviš.</p>
                  {investments.activity.filter((item) => item.instrumentId === position.instrumentId && item.investmentAccountId === position.investmentAccountId && (item.type === "buy" || item.type === "sell")).map((item) => <InvestmentCorrectionForm key={item.id} activity={item} accounts={options.investmentAccounts} instruments={options.instruments} currencies={options.currencies} label={`${item.journalTransactionId === null ? "Početni unos" : item.type === "buy" ? "Kupovina" : "Prodaja"} · ${item.occurredAt.toLocaleDateString("sr-Latn-RS", { timeZone: "Europe/Belgrade" })}`} />)}
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <details>
          <summary className="min-h-11 cursor-pointer text-xl font-semibold">Detalji kupovina (FIFO)</summary>
          <p className="mt-2 text-sm text-slate-400">Svaki lot je jedna kupovina sa svojim datumom i troškom. Pri prodaji prvo se obračunava najranije kupljena količina.</p>
          {investments.lots.length === 0 ? (
            <div className="mt-4"><EmptyState title="Nema lotova" /></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {investments.lots.map((lot) => (
                <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm" key={lot.id}>
                  <div className="flex justify-between gap-3">
                    <span>{lot.acquiredAt.toLocaleDateString("sr-Latn-RS")}</span>
                    <FinancialValue className="tabular-nums">{lot.remainingQuantity} / {lot.quantity}</FinancialValue>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Osnovica <Money amount={lot.costAmount} currencyCode={lot.costCurrencyCode} /> + naknada <Money amount={lot.feeAmount} currencyCode={lot.costCurrencyCode} /></p>
                </li>
              ))}
            </ul>
          )}
          {investments.pagination.lotsHasMore ? (
            <p className="mt-3 text-xs text-slate-500">Prikazano je poslednjih {investments.pagination.limit} lotova.</p>
          ) : null}
        </details>
        <div>
          <h2 className="text-xl font-semibold">Trgovine i prihodi</h2>
          {investments.activity.length === 0 ? (
            <div className="mt-4"><EmptyState title="Nema investicione aktivnosti" /></div>
          ) : (
            <ul className="mt-4 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] px-4">
              {investments.activity.map((item) => (
                <li className="flex flex-wrap justify-between gap-3 py-4 text-sm" key={item.id}>
                  <div>
                    <p className="font-medium">{item.symbol} · {item.type}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.occurredAt.toLocaleDateString("sr-Latn-RS")} · {item.accountName}</p>
                  </div>
                  <div className="text-right tabular-nums"><FinancialValue>
                    {item.grossAmount ?? item.feeAmount ?? item.quantity ?? "—"}{" "}
                    {item.grossAmount || item.feeAmount ? item.tradeCurrencyCode : ""}
                  </FinancialValue></div>
                  <InvestmentCorrectionForm activity={item} accounts={options.investmentAccounts} instruments={options.instruments} currencies={options.currencies} />
                </li>
              ))}
            </ul>
          )}
          {investments.pagination.activityHasMore ? (
            <p className="mt-3 text-xs text-slate-500">Prikazano je poslednjih {investments.pagination.limit} aktivnosti.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}
