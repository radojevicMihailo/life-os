"use client";

import { useActionState } from "react";
import { archiveGoalAction, saveGoalAction } from "@/modules/finance/ui/actions/goals";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";
type Asset = { id: string; name: string; currencyCode: string; classification: string; isActive: boolean };

export function GoalForm({ accounts, goal }: { accounts: Asset[]; goal?: { id: string; name: string; accountId: string; targetAmount: string; targetCurrencyCode?: string; currencyCode?: string } }) {
  const [state, action, pending] = useActionState(saveGoalAction, undefined);
  return <form action={action} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><h2 className="font-semibold">{goal ? `Izmeni: ${goal.name}` : "Novi cilj"}</h2>{goal ? <input name="id" type="hidden" value={goal.id} /> : null}<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Naziv cilja<input className={control} defaultValue={goal?.name} name="name" required /></label><label className="text-xs text-slate-400">Povezani račun<select className={control} defaultValue={goal?.accountId} name="accountId" required><option value="">Izaberi</option>{accounts.filter((item) => item.isActive && item.classification === "asset").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currencyCode}</option>)}</select></label><label className="text-xs text-slate-400">Valuta cilja<input className={control} defaultValue={goal?.targetCurrencyCode ?? goal?.currencyCode ?? "EUR"} maxLength={3} name="targetCurrencyCode" /></label><label className="text-xs text-slate-400">Ciljni iznos<input className={control} defaultValue={goal?.targetAmount} inputMode="decimal" name="targetAmount" required /></label></div><button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950" disabled={pending}>Sačuvaj cilj</button><ActionMessage state={state} success="Cilj je sačuvan." /></form>;
}

export function ArchiveGoalForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(archiveGoalAction, undefined);
  return <form action={action} className="mt-3"><input name="id" type="hidden" value={id} /><button aria-label={`Arhiviraj cilj ${name}`} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs" disabled={pending}>Arhiviraj</button><ActionMessage state={state} success="Cilj je arhiviran." /></form>;
}
