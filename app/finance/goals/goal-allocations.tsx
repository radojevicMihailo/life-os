"use client";

import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";

import { useActionState, useState } from "react";
import { setAccountPurposeAction, removeAccountPurposeAction } from "@/modules/finance/ui/actions/account-purposes";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";
import { Money } from "@/modules/finance/ui/components/money";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";
export type AllocationAccount = { id: string; name: string; currencyCode: string; free: string };

export function GoalAllocationForm({ goalId, accounts, allocation }: {
  goalId: string;
  accounts: AllocationAccount[];
  allocation?: { accountId: string; amount: string };
}) {
  const [state, action, pending] = useActionState(setAccountPurposeAction, undefined);
  const [accountId, setAccountId] = useState(allocation?.accountId ?? accounts[0]?.id ?? "");
  const selected = accounts.find((account) => account.id === accountId);
  if (!accounts.length) return <p className="text-sm text-muted-foreground">Dodaj aktivan račun u Finansije → Računi da izdvojiš sredstva.</p>;
  return <form action={action} className="space-y-3">
    <input type="hidden" name="target" value={`goal:${goalId}`} />
    {allocation ? <input type="hidden" name="accountId" value={allocation.accountId} /> : <label className="block text-xs text-slate-400">Račun<select className={control} name="accountId" value={accountId} onChange={(event) => setAccountId(event.target.value)} required disabled={pending}>
      {accounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currencyCode}</option>)}
    </select></label>}
    <label className="block text-xs text-slate-400">{allocation ? "Rezervisani iznos" : "Iznos koji izdvajaš"} ({selected?.currencyCode})<input className={control} name="amount" inputMode="decimal" placeholder="0,00" defaultValue={decimalInputValue(allocation?.amount)} required disabled={pending} /></label>
    {selected ? <p className="text-xs text-slate-500">{allocation ? "Dodatno slobodno na računu" : "Slobodno na računu"}: <Money amount={selected.free} currencyCode={selected.currencyCode} />. Iznos se čuva u valuti računa.</p> : null}
    <button className="min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white" disabled={pending}>{allocation ? "Sačuvaj iznos" : "Izdvoji za cilj"}</button>
    <ActionMessage state={state} success={allocation ? "Rezervacija je izmenjena." : "Sredstva su izdvojena za cilj."} />
  </form>;
}

export function ReleaseGoalAllocation({ id, accountId, name }: { id: string; accountId: string; name: string }) {
  const [state, action, pending] = useActionState(removeAccountPurposeAction, undefined);
  return <form action={action}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="accountId" value={accountId} />
    <button className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-slate-400" aria-label={`Oslobodi sredstva sa računa ${name}`} disabled={pending}>Oslobodi sredstva</button>
    <ActionMessage state={state} success="Sredstva su oslobođena." />
  </form>;
}
