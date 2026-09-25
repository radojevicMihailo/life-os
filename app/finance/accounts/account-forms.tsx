"use client";

import { useActionState } from "react";

import { archiveAccountAction, createAccountAction } from "@/modules/finance/ui/actions/accounts";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

export function AccountForm({ currencies }: { currencies: Array<{ code: string; isActive: boolean }> }) {
  const [state, action, pending] = useActionState(createAccountAction, undefined);
  return <form action={action} className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-lg font-semibold">Novi račun</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">Naziv računa<input className={control} name="name" required /></label><label className="text-xs text-slate-400">Vrsta računa<select className={control} name="classification"><option value="asset">Aktiva</option><option value="liability">Obaveza</option><option value="receivable">Potraživanje</option></select></label><label className="text-xs text-slate-400">Podvrsta računa<input className={control} name="subtype" required /></label><label className="text-xs text-slate-400">Valuta računa<select className={control} name="currencyCode">{currencies.filter((currency) => currency.isActive).map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label></div><button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950" disabled={pending}>Kreiraj račun</button><ActionMessage state={state} success="Račun je kreiran." /></form>;
}

export function ArchiveAccountForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(archiveAccountAction, undefined);
  return <form action={action} className="mt-4"><input name="id" type="hidden" value={id} /><button aria-label={`Arhiviraj račun ${name}`} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs text-slate-300" disabled={pending}>Arhiviraj</button><ActionMessage state={state} success="Račun je arhiviran." /></form>;
}
