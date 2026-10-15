import { Input } from "@/components/ui/input";
import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { TransactionAmounts } from "@/modules/finance/ui/components/transaction-amounts";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { listTransactions } from "@/modules/finance/read-models/transactions";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import Link from "next/link";
import { parseTransactionFilters } from "@/modules/finance/ui/forms/transaction-filters";
import { transactionTypeLabels } from "@/modules/finance/ui/components/transaction-labels";
import { TransactionForm } from "./transaction-form";
import { CorrectionForm } from "./correction-form";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseTransactionFilters(params);
  const { dependencies } = await loadReadModelRuntime();
  const [transactions, options] = await Promise.all([
    listTransactions(dependencies, filters),
    getMutationOptions(dependencies),
  ]);

  const historyRaw = Array.isArray(params.history) ? params.history[0] : params.history;
  const history = (historyRaw ?? "").split(",").filter(x => /^[A-Za-z0-9_-]{1,1000}$/.test(x)).slice(-30);
  const pageUrl = (cursor: string | undefined, stack: string[]) => {
    const query = new URLSearchParams();
    for (const key of ["accountId","categoryId","dateFrom","dateTo","q","type"] as const) if(filters[key]) query.set(key, filters[key]!);
    if(cursor) query.set("cursor", cursor);
    if(stack.length) query.set("history",stack.join(","));
    return `/finance/transactions?${query}`;
  };
  const currentCursor = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;
  return (
    <>
      <PageHeader eyebrow="Promet" title="Transakcije">Hronološki pregled knjiženja sa filterima i jasnim izvornim iznosima.</PageHeader>
      <div id="new-transaction" className="scroll-mt-24"><TransactionForm accounts={options.accounts} categories={options.categories} /></div>
      <form className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="text-xs text-muted-foreground">Od<Input className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" defaultValue={filters.dateFrom} name="dateFrom" type="date" /></label>
        <label className="text-xs text-muted-foreground">Do<Input className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" defaultValue={filters.dateTo} name="dateTo" type="date" /></label>
        <label className="text-xs text-muted-foreground">Tip<select className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" defaultValue={filters.type ?? ""} name="type"><option value="">Svi tipovi</option>{Object.entries(transactionTypeLabels).filter(([type]) => type !== "correction").map(([type,label]) => <option key={type} value={type}>{label}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Račun<select className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" defaultValue={filters.accountId ?? ""} name="accountId"><option value="">Svi računi</option>{options.accounts.map(a=><option key={a.id} value={a.id}>{a.name}{a.isActive ? "" : " · Arhiviran"}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Kategorija<select className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" defaultValue={filters.categoryId ?? ""} name="categoryId"><option value="">Sve kategorije</option>{options.categories.map(c=><option key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " · Arhivirana"}</option>)}</select></label>
        <label className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">Pretraga opisa<Input className="mt-1" name="q" defaultValue={filters.q} maxLength={200} placeholder="Npr. kafa, računi…" /></label>
        <Link href="/finance/transactions" className="py-2 text-sm text-blue-700 dark:text-blue-200">Očisti filtere</Link>
        <button className="min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-2 lg:col-span-5" type="submit">Primeni filtere</button>
      </form>
      {transactions.items.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nema transakcija za izabrane filtere" /></div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <div className="divide-y divide-border md:hidden">
            {transactions.items.map((transaction) => <article className="p-4" key={transaction.id}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{transaction.description ?? transactionTypeLabels[transaction.type]}</p><p className="mt-1 text-xs text-muted-foreground">{transaction.occurredAt.toLocaleDateString("sr-Latn-RS", { timeZone: "Europe/Belgrade" })}</p></div><TransactionAmounts amounts={transaction.nativeAmounts} /></div><p className="mt-3 text-xs text-muted-foreground">{[...transaction.accountNames, ...transaction.categoryNames].join(" · ") || "Bez dimenzija"}</p>{transaction.correctionDraft ? <CorrectionForm accounts={options.accounts} categories={options.categories} transaction={{ ...transaction, correctionDraft: transaction.correctionDraft }} /> : null}</article>)}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-4">Datum</th><th className="px-5 py-4">Opis</th><th className="px-5 py-4">Račun / kategorija</th><th className="px-5 py-4 text-right">Iznos</th></tr></thead><tbody className="divide-y divide-border">{transactions.items.map((transaction) => <tr key={transaction.id}><td className="whitespace-nowrap px-5 py-4">{transaction.occurredAt.toLocaleDateString("sr-Latn-RS", { timeZone: "Europe/Belgrade" })}</td><td className="px-5 py-4"><p className="font-medium">{transaction.description ?? transactionTypeLabels[transaction.type]}</p>{transaction.correctionDraft ? <CorrectionForm accounts={options.accounts} categories={options.categories} transaction={{ ...transaction, correctionDraft: transaction.correctionDraft }} /> : null}</td><td className="px-5 py-4 text-muted-foreground">{[...transaction.accountNames, ...transaction.categoryNames].join(" · ")}</td><td className="px-5 py-4 text-right"><TransactionAmounts amounts={transaction.nativeAmounts} /></td></tr>)}</tbody></table></div>
        </section>
      )}
      <nav aria-label="Stranice transakcija" className="mt-5 flex justify-between gap-4">
        {filters.cursor ? <Link className="text-blue-700 dark:text-blue-200 py-3" href={pageUrl(history.at(-1) === "first" ? undefined : history.at(-1), history.slice(0,-1))}>← Prethodno</Link> : <span />}
        {transactions.nextCursor ? <Link className="text-blue-700 dark:text-blue-200 py-3" href={pageUrl(transactions.nextCursor,[...history,currentCursor ?? "first"])}>Sledeće →</Link> : null}
      </nav>
    </>
  );
}
