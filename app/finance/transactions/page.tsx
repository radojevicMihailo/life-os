import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { TransactionAmounts } from "@/modules/finance/ui/components/transaction-amounts";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { listTransactions } from "@/modules/finance/read-models/transactions";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import type { JournalSource, JournalType } from "@/modules/finance/domain/ledger";
import { TransactionForm } from "./transaction-form";
import { CorrectionForm } from "./correction-form";

const TYPES = ["income", "expense", "transfer", "foreign_exchange", "opening_balance", "correction", "receivable_out", "receivable_repayment", "investment_trade", "fee"] as const;
const SOURCES = ["web", "shortcut", "seed", "system"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const typeValue = first(params.type);
  const sourceValue = first(params.source);
  const filters = {
    accountId: first(params.accountId) || undefined,
    categoryId: first(params.categoryId) || undefined,
    dateFrom: first(params.dateFrom) || undefined,
    dateTo: first(params.dateTo) || undefined,
    source: SOURCES.includes(sourceValue as JournalSource) ? sourceValue as JournalSource : undefined,
    type: TYPES.includes(typeValue as JournalType) ? typeValue as JournalType : undefined,
  };
  const { dependencies } = await loadReadModelRuntime();
  const [transactions, options] = await Promise.all([
    listTransactions(dependencies, filters),
    getMutationOptions(dependencies),
  ]);

  return (
    <>
      <PageHeader eyebrow="Promet" title="Transakcije">Hronološki pregled knjiženja sa filterima i jasnim izvornim iznosima.</PageHeader>
      <TransactionForm accounts={options.accounts} categories={options.categories} />
      <form className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <label className="text-xs text-slate-400">Od<input className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.dateFrom} name="dateFrom" type="date" /></label>
        <label className="text-xs text-slate-400">Do<input className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.dateTo} name="dateTo" type="date" /></label>
        <label className="text-xs text-slate-400">Tip<select className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.type ?? ""} name="type"><option value="">Svi tipovi</option>{TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="text-xs text-slate-400">Izvor<select className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.source ?? ""} name="source"><option value="">Svi izvori</option>{SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
        <label className="text-xs text-slate-400">ID računa<input className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.accountId} name="accountId" /></label>
        <label className="text-xs text-slate-400">ID kategorije<input className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" defaultValue={filters.categoryId} name="categoryId" /></label>
        <button className="min-h-11 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:col-span-2 lg:col-span-6" type="submit">Primeni filtere</button>
      </form>
      {transactions.items.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nema transakcija za izabrane filtere" /></div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="divide-y divide-white/10 md:hidden">
            {transactions.items.map((transaction) => <article className="p-4" key={transaction.id}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{transaction.description ?? transaction.type}</p><p className="mt-1 text-xs text-slate-500">{transaction.occurredAt.toLocaleString("sr-Latn-RS")} · {transaction.source}</p></div><TransactionAmounts amounts={transaction.nativeAmounts} /></div><p className="mt-3 text-xs text-slate-400">{[...transaction.accountNames, ...transaction.categoryNames].join(" · ") || "Bez dimenzija"}{transaction.corrected ? " · Ispravljeno" : ""}</p>{transaction.correctionDraft && !transaction.corrected ? <CorrectionForm transaction={{ ...transaction, correctionDraft: transaction.correctionDraft }} /> : null}</article>)}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Datum</th><th className="px-5 py-4">Opis</th><th className="px-5 py-4">Račun / kategorija</th><th className="px-5 py-4">Izvor</th><th className="px-5 py-4 text-right">Iznos</th></tr></thead><tbody className="divide-y divide-white/10">{transactions.items.map((transaction) => <tr key={transaction.id}><td className="whitespace-nowrap px-5 py-4">{transaction.occurredAt.toLocaleDateString("sr-Latn-RS")}</td><td className="px-5 py-4"><p className="font-medium">{transaction.description ?? transaction.type}</p>{transaction.corrected ? <p className="text-xs text-amber-200">Ispravljeno</p> : null}{transaction.correctionDraft && !transaction.corrected ? <CorrectionForm transaction={{ ...transaction, correctionDraft: transaction.correctionDraft }} /> : null}</td><td className="px-5 py-4 text-slate-400">{[...transaction.accountNames, ...transaction.categoryNames].join(" · ")}</td><td className="px-5 py-4">{transaction.source}</td><td className="px-5 py-4 text-right"><TransactionAmounts amounts={transaction.nativeAmounts} /></td></tr>)}</tbody></table></div>
        </section>
      )}
    </>
  );
}
