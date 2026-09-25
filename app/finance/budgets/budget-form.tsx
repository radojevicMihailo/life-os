"use client";

import { useActionState } from "react";
import { setBudgetAction } from "@/modules/finance/ui/actions/budgets";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

export function BudgetForm({ categories, currencies, month }: { categories: Array<{ id: string; name: string; classification: string; isActive: boolean }>; currencies: Array<{ code: string; isActive: boolean }>; month: string }) {
  const [state, action, pending] = useActionState(setBudgetAction, undefined);
  return <form action={action} className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4"><h2 className="font-semibold">Postavi mesečni limit</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">Kategorija budžeta<select className={control} name="categoryId" required><option value="">Izaberi</option>{categories.filter((item) => item.isActive && item.classification === "expense").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs text-slate-400">Mesec budžeta<input className={control} defaultValue={month} name="month" type="month" /></label><label className="text-xs text-slate-400">Valuta budžeta<select className={control} name="currencyCode">{currencies.filter((item) => item.isActive).map((item) => <option key={item.code}>{item.code}</option>)}</select></label><label className="text-xs text-slate-400">Mesečni limit<input className={control} inputMode="decimal" name="amount" required /></label></div><button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950" disabled={pending}>Sačuvaj limit</button><ActionMessage state={state} success="Limit je sačuvan i prenos preračunat." /></form>;
}
