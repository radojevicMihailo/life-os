"use client";

import { useActionState, useState } from "react";

import type { TransactionCorrectionDraft } from "@/modules/finance/read-models/transactions";
import { correctTransactionAction } from "@/modules/finance/ui/actions/transactions";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-white";

type CorrectableTransaction = {
  id: string;
  type: string;
  description: string | null;
  correctionDraft: TransactionCorrectionDraft;
};

function PreservedDimensions({ draft }: { draft: TransactionCorrectionDraft }) {
  switch (draft.operation) {
    case "expense":
    case "income":
      return <><input name="accountId" type="hidden" value={draft.accountId} /><input name="categoryId" type="hidden" value={draft.categoryId} /></>;
    case "opening_balance":
      return <input name="accountId" type="hidden" value={draft.accountId} />;
    case "transfer":
      return <><input name="fromAccountId" type="hidden" value={draft.fromAccountId} /><input name="toAccountId" type="hidden" value={draft.toAccountId} /></>;
    case "receivable_out":
      return <><input name="fromAccountId" type="hidden" value={draft.fromAccountId} /><input name="receivableAccountId" type="hidden" value={draft.receivableAccountId} /></>;
    case "receivable_repayment":
      return <><input name="receivableAccountId" type="hidden" value={draft.receivableAccountId} /><input name="toAccountId" type="hidden" value={draft.toAccountId} /></>;
  }
}

function AmountFields({ draft }: { draft: TransactionCorrectionDraft }) {
  const foreign = draft.operation === "transfer" && "fromAmount" in draft;
  const [conversionMethod, setConversionMethod] = useState<"toAmount" | "effectiveRate">("toAmount");
  if (foreign) {
    return <>
      <label className="text-xs text-slate-400">Ispravljeni izvorni iznos<input className={control} defaultValue={draft.fromAmount} inputMode="decimal" name="fromAmount" required /></label>
      <label className="text-xs text-slate-400">Način konverzije<select className={control} onChange={(event) => setConversionMethod(event.target.value as "toAmount" | "effectiveRate")} value={conversionMethod}><option value="toAmount">Odredišni iznos</option><option value="effectiveRate">Efektivni kurs</option></select></label>
      {conversionMethod === "toAmount"
        ? <label className="text-xs text-slate-400">Ispravljeni odredišni iznos<input className={control} defaultValue={draft.toAmount} inputMode="decimal" name="toAmount" required /></label>
        : <label className="text-xs text-slate-400">Ispravljeni efektivni kurs<input className={control} defaultValue={draft.effectiveRate} inputMode="decimal" name="effectiveRate" required /></label>}
    </>;
  }
  const amount = "amount" in draft ? draft.amount : "";
  return <label className="text-xs text-slate-400">Ispravljeni iznos<input className={control} defaultValue={amount} inputMode="decimal" name="correctedAmount" required /></label>;
}

export function CorrectionForm({ transaction }: { transaction: CorrectableTransaction }) {
  const [state, action, pending] = useActionState(correctTransactionAction, undefined);
  const { correctionDraft: draft } = transaction;
  return (
    <details className="mt-3 text-left">
      <summary className="cursor-pointer text-xs font-medium text-teal-200">Ispravi {transaction.description ?? transaction.type}</summary>
      <form action={action} className="mt-3 grid gap-2 rounded-xl bg-slate-950/70 p-3">
        <input name="originalId" type="hidden" value={transaction.id} />
        <input name="operation" type="hidden" value={draft.operation} />
        <PreservedDimensions draft={draft} />
        <AmountFields draft={draft} />
        {(draft.operation === "receivable_out" || draft.operation === "receivable_repayment")
          ? <label className="text-xs text-slate-400">Druga strana<input className={control} defaultValue={draft.counterparty} name="counterparty" required /></label>
          : null}
        <label className="text-xs text-slate-400">Novi opis transakcije<input className={control} defaultValue={transaction.description ?? ""} name="replacementDescription" /></label>
        <label className="text-xs text-slate-400">Razlog / opis storna<input className={control} name="correctionDescription" /></label>
        <button className="min-h-11 rounded-xl border border-teal-300/30 px-3 text-sm text-teal-100" disabled={pending}>Sačuvaj ispravku</button>
        <ActionMessage state={state} success="Ispravka je sačuvana." />
      </form>
    </details>
  );
}
