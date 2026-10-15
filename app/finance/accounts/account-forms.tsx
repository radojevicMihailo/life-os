"use client";

import { useActionState } from "react";

import {
  archiveAccountAction, createAccountAction, deleteAccountAction, restoreAccountAction, updateAccountAction,
} from "@/modules/finance/ui/actions/accounts";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";
type CurrencyOption = { code: string; isActive: boolean };
type EditableAccount = {
  id: string; name: string; classification: "asset" | "liability" | "receivable";
  subtype: string; currencyCode: string;
};

export function AccountForm({ currencies }: { currencies: CurrencyOption[] }) {
  const [state, action, pending] = useActionState(createAccountAction, undefined);
  return <form action={action} className="mb-8 rounded-3xl border border-border bg-card p-5">
    <h2 className="text-lg font-semibold">Novi račun</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs text-muted-foreground">Naziv računa<input className={control} name="name" required /></label>
      <label className="text-xs text-muted-foreground">Vrsta računa<select className={control} name="classification"><option value="asset">Aktiva</option><option value="liability">Obaveza</option><option value="receivable">Potraživanje</option></select></label>
      <label className="text-xs text-muted-foreground">Podvrsta računa<input className={control} name="subtype" required /></label>
      <label className="text-xs text-muted-foreground">Valuta računa<select className={control} name="currencyCode" defaultValue="EUR">{currencies.filter((currency) => currency.isActive).map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label>
    </div>
    <button className="mt-4 min-h-11 action-button rounded-xl px-5 text-sm font-semibold text-white" disabled={pending}>Kreiraj račun</button>
    <ActionMessage state={state} success="Račun je kreiran." />
  </form>;
}

export function EditAccountForm({ account, currencies }: { account: EditableAccount; currencies: CurrencyOption[] }) {
  const [state, action, pending] = useActionState(updateAccountAction, undefined);
  return <details className="mt-4 border-t border-border pt-4">
    <summary className="min-h-11 cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-200">Izmeni račun</summary>
    <form action={action} className="mt-3 space-y-3">
      <input name="id" type="hidden" value={account.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Naziv računa<input className={control} name="name" defaultValue={account.name} required /></label>
        <label className="text-xs text-muted-foreground">Vrsta računa<select className={control} name="classification" defaultValue={account.classification}><option value="asset">Aktiva</option><option value="liability">Obaveza</option><option value="receivable">Potraživanje</option></select></label>
        <label className="text-xs text-muted-foreground">Podvrsta računa<input className={control} name="subtype" defaultValue={account.subtype} required /></label>
        <label className="text-xs text-muted-foreground">Valuta računa<select className={control} name="currencyCode" defaultValue={account.currencyCode}>{currencies.filter((currency) => currency.isActive || currency.code === account.currencyCode).map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label>
      </div>
      <p className="text-xs text-muted-foreground">Vrsta i valuta mogu da se promene samo dok račun nema transakcije, rezervisane namene, ciljeve ili povezan investicioni račun.</p>
      <button className="min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white" disabled={pending}>Sačuvaj izmene</button>
      <ActionMessage state={state} success="Račun je izmenjen." />
    </form>
  </details>;
}

export function AccountStatusForm({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(isActive ? archiveAccountAction : restoreAccountAction, undefined);
  return <form action={action} className="mt-4">
    <input name="id" type="hidden" value={id} />
    <button aria-label={`${isActive ? "Arhiviraj" : "Vrati"} račun ${name}`} className="min-h-11 rounded-xl border border-border px-3 text-xs text-foreground" disabled={pending}>
      {isActive ? "Arhiviraj" : "Vrati račun"}
    </button>
    <ActionMessage state={state} success={isActive ? "Račun je arhiviran." : "Račun je ponovo aktivan."} />
  </form>;
}

export function DeleteAccountForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, undefined);
  return <form action={action} className="mt-3" onSubmit={(event) => {
    if (!window.confirm(`Trajno obrisati račun „${name}“?`)) event.preventDefault();
  }}>
    <input name="id" type="hidden" value={id} />
    <button aria-label={`Obriši račun ${name}`} className="min-h-11 rounded-xl border border-red-400/30 px-3 text-xs text-red-300" disabled={pending}>Obriši</button>
    <ActionMessage state={state} success="Račun je obrisan." />
  </form>;
}
