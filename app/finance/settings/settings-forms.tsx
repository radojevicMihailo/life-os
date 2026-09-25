"use client";

import { useActionState } from "react";
import { activateCurrencyAction } from "@/modules/finance/ui/actions/accounts";
import { archiveCategoryAction, createCategoryAction } from "@/modules/finance/ui/actions/categories";
import { clearOverrideAction, setOverrideAction } from "@/modules/finance/ui/actions/settings";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategoryAction, undefined);
  return <form action={action}><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Naziv kategorije<input className={control} name="name" required /></label><label className="text-xs text-slate-400">Vrsta kategorije<select className={control} name="classification"><option value="expense">Trošak</option><option value="income">Prihod</option></select></label></div><button className="mt-3 min-h-11 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950" disabled={pending}>Kreiraj kategoriju</button><ActionMessage state={state} success="Kategorija je kreirana." /></form>;
}
export function ArchiveCategoryForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(archiveCategoryAction, undefined);
  return <form action={action}><input name="id" type="hidden" value={id} /><button aria-label={`Arhiviraj kategoriju ${name}`} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs" disabled={pending}>Arhiviraj</button><ActionMessage state={state} success="Kategorija je arhivirana; istorija ostaje vidljiva." /></form>;
}

export function CurrencyActivationForm({ currencies }: { currencies: Array<{ code: string; name: string; isActive: boolean }> }) {
  const [state, action, pending] = useActionState(activateCurrencyAction, undefined);
  return <form action={action} className="mt-5"><label className="text-xs text-slate-400">Aktiviraj valutu<select className={control} name="currencyCode">{currencies.filter((item) => !item.isActive).map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label><button className="mt-3 min-h-11 rounded-xl border border-white/10 px-4 text-sm" disabled={pending}>Aktiviraj valutu</button><ActionMessage state={state} success="Valuta je aktivirana." /></form>;
}

export function OverrideForm({ instruments }: { instruments: Array<{ id: string; symbol: string; quoteCurrencyCode: string }> }) {
  const [state, action, pending] = useActionState(setOverrideAction, undefined);
  return <form action={action} className="mt-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Vrsta ručne vrednosti<select className={control} name="kind"><option value="exchange_rate">Kurs</option><option value="market_quote">Cena instrumenta</option></select></label><label className="text-xs text-slate-400">Osnovna valuta<input className={control} defaultValue="RSD" name="baseCurrencyCode" /></label><label className="text-xs text-slate-400">Kotirana valuta<input className={control} defaultValue="EUR" name="quoteCurrencyCode" /></label><label className="text-xs text-slate-400">Instrument<select className={control} name="instrumentId"><option value="">Za kurs nije potreban</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol}</option>)}</select></label><label className="text-xs text-slate-400">Ručna vrednost<input className={control} inputMode="decimal" name="value" required /></label></div><button className="mt-3 min-h-11 rounded-xl bg-amber-200 px-4 text-sm font-semibold text-slate-950" disabled={pending}>Postavi ručnu vrednost</button><ActionMessage state={state} success="Ručna vrednost je aktivna." /></form>;
}

export function ClearOverrideForm({ override }: { override: { kind: string; instrumentId: string | null; baseCurrencyCode: string | null; quoteCurrencyCode: string | null } }) {
  const [state, action, pending] = useActionState(clearOverrideAction, undefined);
  return <form action={action}><input name="kind" type="hidden" value={override.kind} /><input name="instrumentId" type="hidden" value={override.instrumentId ?? ""} /><input name="baseCurrencyCode" type="hidden" value={override.baseCurrencyCode ?? ""} /><input name="quoteCurrencyCode" type="hidden" value={override.quoteCurrencyCode ?? ""} /><button className="min-h-11 rounded-xl border border-amber-200/30 px-3 text-xs" disabled={pending}>Ukloni ručnu vrednost</button><ActionMessage state={state} success="Ručna vrednost je uklonjena." /></form>;
}
