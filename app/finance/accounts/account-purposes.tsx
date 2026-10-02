"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { AccountPurposeItem, AccountPurposeOption, AccountPurposeSummary } from "@/modules/finance/read-models/account-purposes";
import { removeAccountPurposeAction, setAccountPurposeAction } from "@/modules/finance/ui/actions/account-purposes";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";
import { Money } from "@/modules/finance/ui/components/money";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

function PurposeRow({ accountId, currencyCode, item, editable }: {
  accountId: string; currencyCode: string; item: AccountPurposeItem; editable: boolean;
}) {
  const [removeState, removeAction, removing] = useActionState(removeAccountPurposeAction, undefined);
  const [editState, editAction, editing] = useActionState(setAccountPurposeAction, undefined);
  return <li className="rounded-xl border border-white/10 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Link className="text-sm text-blue-200 hover:underline" href={item.type === "goal" ? "/finance/goals" : item.budgetMonth ? `/finance/budgets?month=${item.budgetMonth}` : "/finance/budgets"}>
        {item.name}{item.targetActive ? "" : " · Arhivirano"}
      </Link>
      <Money amount={item.amount} currencyCode={currencyCode} />
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {editable && item.targetActive ? <details className="flex-1"><summary className="min-h-11 cursor-pointer py-3 text-xs text-slate-400">Izmeni iznos</summary>
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="accountId" value={accountId} /><input type="hidden" name="target" value={`${item.type}:${item.targetId}`} />
          <label className="text-xs text-slate-400">Rezervisani iznos ({currencyCode})<input className={control} name="amount" inputMode="decimal" defaultValue={item.amount.includes(".") ? item.amount.replace(/\.?0+$/, "") : item.amount} required /></label>
          <button disabled={editing} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs">Sačuvaj iznos</button>
          <ActionMessage state={editState} success="Iznos je sačuvan." />
        </form>
      </details> : null}
      <form action={removeAction}><input type="hidden" name="accountId" value={accountId} /><input type="hidden" name="id" value={item.id} />
        <button disabled={removing} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs text-slate-300" aria-label={`Oslobodi novac: ${item.name}`}>Oslobodi novac</button>
        <ActionMessage state={removeState} success="Novac je oslobođen." />
      </form>
    </div>
  </li>;
}

export function AccountPurposes({ accountId, currencyCode, active, summary, options }: {
  accountId: string; currencyCode: string; active: boolean; summary: AccountPurposeSummary; options: AccountPurposeOption[];
}) {
  const [state, action, pending] = useActionState(setAccountPurposeAction, undefined);
  const available = options.filter((o) => o.currencyCode === currencyCode && !summary.items.some((p) => p.type === o.type && p.targetId === o.id));
  return <section className="mt-4 border-t border-white/10 pt-4" aria-label="Namena novca">
    <h4 className="text-sm font-semibold">Za šta je novac</h4>
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400">
      <div>Rezervisano<p className="mt-1 text-slate-200"><Money amount={summary.reserved} currencyCode={currencyCode} /></p></div>
      <div>Slobodno<p className="mt-1 text-emerald-300"><Money amount={summary.free} currencyCode={currencyCode} /></p></div>
    </div>
    {summary.deficit !== "0" ? <p role="status" className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">Nedostaje <Money amount={summary.deficit} currencyCode={currencyCode} /> za rezervisane namene. Smanji rezervacije ili dopuni račun.</p> : null}
    {summary.items.length ? <ul className="mt-3 space-y-2">{summary.items.map((item) => <PurposeRow key={`${item.id}-${item.amount}`} accountId={accountId} currencyCode={currencyCode} item={item} editable={active} />)}</ul> : <p className="mt-3 text-xs text-slate-500">Novac još nije raspoređen na ciljeve ili budžete.</p>}
    {active ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm text-blue-200">Rezerviši za namenu</summary>
      <p className="mb-3 text-xs text-slate-500">Rezervacija planira novac u valuti računa. Saldo i transakcije ostaju isti; potrošnja može stvoriti manjak.</p>
      {available.length ? <form action={action} className="space-y-3">
        <input type="hidden" name="accountId" value={accountId} />
        <label className="block text-xs text-slate-400">Cilj ili budžet<select name="target" className={control} required>{available.map((o) => <option value={`${o.type}:${o.id}`} key={`${o.type}:${o.id}`}>{o.name}</option>)}</select></label>
        <label className="block text-xs text-slate-400">Iznos ({currencyCode})<input name="amount" className={control} inputMode="decimal" placeholder="0,00" required /></label>
        <button disabled={pending} className="min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white">Rezerviši novac</button>
        <ActionMessage state={state} success="Novac je rezervisan." />
      </form> : <p className="text-xs text-slate-400">Nema dodatnih ciljeva ili budžeta u valuti {currencyCode}. Dodaj ih na <Link className="text-blue-200 underline" href="/finance/goals">Ciljevima</Link> ili <Link className="text-blue-200 underline" href="/finance/budgets">Budžetima</Link>.</p>}
    </details> : null}
  </section>;
}
