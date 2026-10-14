"use client";

import { useActionState } from "react";
import { deleteTransactionAction } from "@/modules/finance/ui/actions/transactions";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";
import { TransactionForm, type EditableTransaction } from "./transaction-form";

type Option = { id: string; name: string; classification: string; currencyCode?: string; isActive: boolean };

export function CorrectionForm({ transaction, accounts, categories }: { transaction: EditableTransaction; accounts: Option[]; categories: Option[] }) {
  const [state, action, pending] = useActionState(deleteTransactionAction, undefined);
  return <div className="mt-3 space-y-2 text-left">
    <details>
      <summary className="min-h-10 cursor-pointer py-2 text-xs font-medium text-blue-200">Izmeni transakciju</summary>
      <TransactionForm transaction={transaction} accounts={accounts} categories={categories} />
    </details>
    <form action={action} onSubmit={(event) => {
      if (!window.confirm("Obrisati ovu transakciju? Njen uticaj na saldo i budžete biće uklonjen.")) event.preventDefault();
    }}>
      <input name="id" type="hidden" value={transaction.id} />
      <button className="min-h-10 rounded-xl border border-red-400/30 px-3 text-xs text-red-300" disabled={pending}>Obriši transakciju</button>
      <ActionMessage state={state} success="Transakcija je obrisana." />
    </form>
  </div>;
}
