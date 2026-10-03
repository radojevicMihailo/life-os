"use client";

import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";

import { useActionState } from "react";
import { archiveGoalAction, saveGoalAction } from "@/modules/finance/ui/actions/goals";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";
type GoalFields = { id: string; name: string; targetAmount: string; currencyCode: string };
type CurrencyOption = { code: string; isActive: boolean };

export function GoalForm({ currencies, goal }: { currencies: CurrencyOption[]; goal?: GoalFields }) {
  const [state, action, pending] = useActionState(saveGoalAction, undefined);
  return <form action={action} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h2 className="font-semibold">{goal ? `Izmeni: ${goal.name}` : "Novi cilj"}</h2>
    {goal ? <input name="id" type="hidden" value={goal.id} /> : null}
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs text-slate-400">Naziv cilja<input className={control} defaultValue={goal?.name} name="name" placeholder="Emergency fond" required /></label>
      <label className="text-xs text-slate-400">Ciljni iznos<input className={control} defaultValue={decimalInputValue(goal?.targetAmount)} placeholder="1.000,00" inputMode="decimal" name="targetAmount" required /></label>
      <label className="text-xs text-slate-400">Valuta cilja<select className={control} defaultValue={goal?.currencyCode ?? "EUR"} name="targetCurrencyCode" required>
        {currencies.filter((currency) => currency.isActive || currency.code === goal?.currencyCode).map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
      </select></label>
    </div>
    {!goal ? <p className="mt-3 text-xs text-slate-500">Nakon kreiranja izdvoji novac sa jednog ili više računa. Računi mogu biti u različitim valutama.</p> : null}
    <button className="mt-4 min-h-11 action-button rounded-xl px-5 text-sm font-semibold text-white" disabled={pending}>Sačuvaj cilj</button>
    <ActionMessage state={state} success="Cilj je sačuvan." />
  </form>;
}

export function ArchiveGoalForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(archiveGoalAction, undefined);
  return <form action={action} className="mt-3"><input name="id" type="hidden" value={id} /><button aria-label={`Arhiviraj cilj ${name}`} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs" disabled={pending}>Arhiviraj</button><ActionMessage state={state} success="Cilj je arhiviran." /></form>;
}
