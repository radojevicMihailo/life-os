import { EmptyState } from "@/modules/finance/ui/components/empty-state";
import { Money } from "@/modules/finance/ui/components/money";
import { PageHeader } from "@/modules/finance/ui/components/page-header";
import { SourceBadge } from "@/modules/finance/ui/components/source-badge";
import { listAccounts } from "@/modules/finance/read-models/accounts";
import { loadReadModelRuntime } from "@/modules/finance/read-models/runtime";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { AccountForm, ArchiveAccountForm } from "./account-forms";

const labels = { asset: "Aktiva", liability: "Obaveze", receivable: "Potraživanja" } as const;

export default async function AccountsPage() {
  const { dependencies, valuationOptions } = await loadReadModelRuntime();
  const [accounts, options] = await Promise.all([
    listAccounts(dependencies, valuationOptions),
    getMutationOptions(dependencies),
  ]);

  return <><PageHeader eyebrow="Bilans" title="Računi">Izvorni saldo je primaran; EUR procena je uvek odvojena i označena izvorom.</PageHeader><AccountForm currencies={options.currencies} /><div className="space-y-8">{Object.entries(accounts.groups).map(([classification, items]) => <section key={classification}><div className="mb-4 flex items-baseline justify-between"><h2 className="text-xl font-semibold">{labels[classification as keyof typeof labels]}</h2><span className="text-xs text-slate-500">{items.length} računa</span></div>{items.length === 0 ? <EmptyState title={`Nema stavki: ${labels[classification as keyof typeof labels]}`} /> : <div className="grid gap-4 lg:grid-cols-2">{items.map((account) => <article className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5" key={account.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{account.name}</h3><p className="mt-1 text-xs text-slate-500">{account.subtype}{account.isActive ? "" : " · Arhiviran"}</p></div><Money amount={account.nativeBalance} currencyCode={account.currencyCode} label={`Saldo računa ${account.name}`} /></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><div><p className="text-xs text-slate-500">Procena u EUR</p><p className="mt-1 font-medium">{account.eurEstimate === null ? "Nedostupan kurs" : <Money amount={account.eurEstimate} currencyCode="EUR" />}</p></div>{account.valuation ? <SourceBadge metadata={account.valuation} /> : null}</div>{account.recentActivity.length ? <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">{account.recentActivity.map((activity) => <li className="flex justify-between gap-3 text-xs" key={`${activity.transactionId}-${activity.amount}`}><span className="text-slate-400">{activity.occurredAt.toLocaleDateString("sr-Latn-RS")} · {activity.type}</span><span className="tabular-nums">{activity.amount} {account.currencyCode}</span></li>)}</ul> : null}{account.isActive ? <ArchiveAccountForm id={account.id} name={account.name} /> : null}</article>)}</div>}</section>)}</div></>;
}
