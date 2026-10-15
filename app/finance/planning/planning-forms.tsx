"use client";
import { useActionState, useState } from "react";
import { savePlanAction, confirmOccurrenceAction, skipOccurrenceAction, linkOccurrenceAction, archivePlanAction, saveCashPreferencesAction } from "@/modules/finance/ui/actions/planning";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";
import { FinancialDetail } from "@/modules/finance/ui/components/finance-privacy";
import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";
import type { PlanRule, PlannedOccurrence } from "@/modules/finance/domain/planning";
const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";
const button = "min-h-11 rounded-xl border border-white/15 px-4 text-sm hover:bg-white/10 disabled:opacity-50";
type Account = {
    id: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    classification: string;
};
type Category = {
    id: string;
    name: string;
    classification: string;
    isActive: boolean;
};
export function PlanForm({ accounts, categories, rule, today }: {
    accounts: Account[];
    categories: Category[];
    rule?: PlanRule;
    today: string;
}) {
    const [state, action, pending] = useActionState(savePlanAction, undefined);
    const [type, setType] = useState(rule?.type ?? "expense");
    return <FinancialDetail><form action={action} className="rounded-2xl border border-white/10 p-4 space-y-4">
 <h2 className="font-semibold">{rule ? "Izmeni plan" : "Novi prihod ili obaveza"}</h2>{rule ? <input type="hidden" name="id" value={rule.id}/> : null}
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 <label>Naziv<input name="name" className={control} defaultValue={rule?.name} required maxLength={200}/></label>
 <label>Vrsta<select name="type" className={control} value={type} onChange={e => setType(e.target.value as "income" | "expense")}><option value="expense">Obaveza</option><option value="income">Prihod</option></select></label>
 <label>Račun<select className={control} name="accountId" defaultValue={rule?.accountId} required>{accounts.filter(a => a.isActive && a.classification === "asset").map(a => <option key={a.id} value={a.id}>{a.name} · {a.currencyCode}</option>)}</select></label>
 <label>Kategorija<select key={type} className={control} name="categoryId" defaultValue={rule?.categoryId} required>{categories.filter(c => c.isActive && c.classification === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Iznos u valuti računa<input name="amount" className={control} inputMode="decimal" defaultValue={decimalInputValue(rule?.amount)} required/></label>
 <label>Prvo dospeće<input type="date" className={control} name="startDate" defaultValue={rule?.startDate ?? today} required/></label>
 <label>Ponavljanje<select name="frequency" className={control} defaultValue={rule?.frequency ?? "monthly"}><option value="once">Jednom</option><option value="weekly">Nedeljno</option><option value="monthly">Mesečno</option><option value="yearly">Godišnje</option></select></label>
 <label>Poslednji datum (opciono)<input type="date" className={control} name="endDate" defaultValue={rule?.endDate ?? ""}/></label>
 </div>{type === "income" ? <label className="flex gap-2"><input type="checkbox" name="isPrimaryIncome" defaultChecked={rule?.isPrimaryIncome}/>Računaj raspoloživ novac do ovog prihoda</label> : null}
 <button className={button} disabled={pending}>Sačuvaj plan</button><ActionMessage state={state} success="Plan je sačuvan."/>
 </form></FinancialDetail>;
}
export function OccurrenceForms({ item, today, transactions }: {
    item: PlannedOccurrence;
    today: string;
    transactions: {
        id: string;
        label: string;
    }[];
}) {
    const [state, action, pending] = useActionState(confirmOccurrenceAction, undefined);
    const [skipState, skipAction, skipping] = useActionState(skipOccurrenceAction, undefined);
    const [linkState, linkAction, linking] = useActionState(linkOccurrenceAction, undefined);
    const keys = <><input type="hidden" name="ruleId" value={item.ruleId}/><input type="hidden" name="dueDate" value={item.dueDate}/></>;
    return <FinancialDetail><div className="mt-3 space-y-3">
 <details><summary className="cursor-pointer py-2 text-blue-200">Potvrdi {item.type === "expense" ? "plaćanje" : "prijem"}</summary><form action={action} className="flex flex-wrap items-end gap-3 py-2">{keys}<label>Iznos<input className={control} name="amount" inputMode="decimal" defaultValue={decimalInputValue(item.amount)} required/></label><label>Stvarni datum<input className={control} name="occurredAt" type="date" max={today} defaultValue={item.dueDate > today ? today : item.dueDate} required/></label><button className={button} disabled={pending}>Potvrdi</button><ActionMessage state={state} success="Transakcija je knjižena."/></form></details>
 {transactions.length ? <details><summary className="cursor-pointer py-2 text-blue-200">Poveži postojeću transakciju</summary><form action={linkAction} className="space-y-2">{keys}<select aria-label="Postojeća transakcija" name="transactionId" className={control}>{transactions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select><button className={button} disabled={linking}>Poveži</button><ActionMessage state={linkState} success="Transakcija je povezana."/></form></details> : null}
 <form action={skipAction}>{keys}<button className={button} disabled={skipping}>Preskoči ovu stavku</button><ActionMessage state={skipState} success="Stavka je preskočena."/></form>
 </div></FinancialDetail>;
}
export function ArchivePlanForm({ id }: {
    id: string;
}) { const [state, action, pending] = useActionState(archivePlanAction, undefined); return <FinancialDetail><form action={action}><input type="hidden" name="id" value={id}/><button className={button} disabled={pending}>Arhiviraj plan</button><ActionMessage state={state} success="Plan je arhiviran."/></form></FinancialDetail>; }
export function CashPreferencesForm({ accounts }: {
    accounts: {
        id: string;
        name: string;
        included: boolean;
    }[];
}) { const [state, action, pending] = useActionState(saveCashPreferencesAction, undefined); return <FinancialDetail><form action={action} className="space-y-3"><h2 className="font-semibold">Računi za raspoloživ novac</h2><p className="text-sm text-slate-400">Izaberi novac koji koristiš za svakodnevnu potrošnju.</p>{accounts.map(a => <label key={a.id} className="flex min-h-11 items-center gap-3"><input type="hidden" name="accountId" value={a.id}/><input type="checkbox" name="included" value={a.id} defaultChecked={a.included}/>{a.name}</label>)}<button className={button} disabled={pending}>Sačuvaj izbor računa</button><ActionMessage state={state} success="Izbor računa je sačuvan."/></form></FinancialDetail>; }
