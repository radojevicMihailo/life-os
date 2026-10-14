"use client";

import { Input } from "@/components/ui/input";

import { useActionState, useState } from "react";

import { createTransactionAction, correctTransactionAction } from "@/modules/finance/ui/actions/transactions";
import { ActionMessage, fieldErrorProps } from "@/modules/finance/ui/components/action-message";

import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";
import type { TransactionCorrectionDraft } from "@/modules/finance/read-models/transactions";

export type EditableTransaction = { id: string; type: string; description: string | null; occurredAt: Date; correctionDraft: TransactionCorrectionDraft };

type Option = { id: string; name: string; classification: string; currencyCode?: string; isActive: boolean };

const input = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

export function TransactionForm({ accounts, categories, transaction }: { accounts: Option[]; categories: Option[]; transaction?: EditableTransaction }) {
  const draft = transaction?.correctionDraft;
  const [state, action, pending] = useActionState(transaction ? correctTransactionAction : createTransactionAction, undefined);
  const [operation, setOperation] = useState<string>(draft?.operation ?? "expense");
  const [accountId, setAccountId] = useState(draft && "accountId" in draft ? draft.accountId : "");
  const [fromAccountId, setFromAccountId] = useState(draft && "fromAccountId" in draft ? draft.fromAccountId : "");
  const [toAccountId, setToAccountId] = useState(draft && "toAccountId" in draft ? draft.toAccountId : "");
  const [conversionMethod, setConversionMethod] = useState<"toAmount" | "effectiveRate">("toAmount");
  const activeAccounts = accounts.filter((account) => account.isActive);
  const activeCategories = categories.filter((category) => category.isActive);
  const standard = ["income", "expense", "opening_balance", "credit_card_purchase"].includes(operation);
  const transfer = ["transfer", "credit_card_repayment"].includes(operation);
  const openingReceivable = operation === "opening_balance" && activeAccounts.find((account) => account.id === accountId)?.classification === "receivable";
  const receivable = ["receivable_out", "receivable_repayment"].includes(operation);
  const fromCurrency = activeAccounts.find((account) => account.id === fromAccountId)?.currencyCode;
  const toCurrency = activeAccounts.find((account) => account.id === toAccountId)?.currencyCode;
  const transferAccountsSelected = Boolean(fromCurrency && toCurrency);
  const foreignTransfer = operation === "transfer" && transferAccountsSelected && fromCurrency !== toCurrency;
  const sameCurrencyTransfer = operation === "transfer" && transferAccountsSelected && fromCurrency === toCurrency;

  return (
    <form action={action} className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{transaction ? "Izmeni transakciju" : "Nova transakcija"}</h2>
      {transaction ? <input name="originalId" type="hidden" value={transaction.id} /> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">Operacija<select className={input} name="operation" onChange={(event) => setOperation(event.target.value)} value={operation}>{[
          ["expense", "Trošak"], ["income", "Prihod"], ["transfer", "Prenos / menjačnica"], ["opening_balance", "Početno stanje"], ["credit_card_purchase", "Kupovina karticom"], ["credit_card_repayment", "Otplata kartice"], ["receivable_out", "Pozajmica"], ["receivable_repayment", "Vraćena pozajmica"],
        ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {standard ? <label className="text-xs text-slate-400">Račun<select className={input} name="accountId" value={accountId} onChange={(event) => setAccountId(event.target.value)} required {...fieldErrorProps(state, "accountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}
        {transfer || operation === "receivable_out" ? <label className="text-xs text-slate-400">Račun sa kog se plaća<select className={input} name="fromAccountId" onChange={(event) => setFromAccountId(event.target.value)} required value={fromAccountId} {...fieldErrorProps(state, "fromAccountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currencyCode}</option>)}</select></label> : null}
        {transfer || operation === "receivable_repayment" ? <label className="text-xs text-slate-400">Odredišni račun<select className={input} name="toAccountId" onChange={(event) => setToAccountId(event.target.value)} required value={toAccountId} {...fieldErrorProps(state, "toAccountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currencyCode}</option>)}</select></label> : null}
        {receivable ? <label className="text-xs text-slate-400">Račun potraživanja<select className={input} name="receivableAccountId" defaultValue={draft && "receivableAccountId" in draft ? draft.receivableAccountId : ""} required {...fieldErrorProps(state, "receivableAccountId")}><option value="">Izaberi</option>{activeAccounts.filter((account) => account.classification === "receivable").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}
        {["income", "expense", "credit_card_purchase"].includes(operation) ? <label className="text-xs text-slate-400">Kategorija<select className={input} name="categoryId" defaultValue={draft && "categoryId" in draft ? draft.categoryId : ""} required {...fieldErrorProps(state, "categoryId")}><option value="">Izaberi</option>{activeCategories.filter((category) => category.classification === (operation === "income" ? "income" : "expense")).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label> : null}
        {operation !== "transfer" ? <label className="text-xs text-slate-400">Iznos<input className={input} inputMode="decimal" name="amount" defaultValue={draft && "amount" in draft ? decimalInputValue(draft.amount) : undefined} required {...fieldErrorProps(state, "amount")} /></label> : null}
        {operation === "transfer" && !transferAccountsSelected ? <p className="self-end text-xs text-slate-400">Izaberite oba računa da bi se prikazala odgovarajuća polja iznosa.</p> : null}
        {sameCurrencyTransfer ? <label className="text-xs text-slate-400">Iznos prenosa ({fromCurrency})<input className={input} inputMode="decimal" name="amount" defaultValue={draft && "amount" in draft ? decimalInputValue(draft.amount) : undefined} required {...fieldErrorProps(state, "amount")} /></label> : null}
        {foreignTransfer ? <>
          <label className="text-xs text-slate-400">Izvorni iznos ({fromCurrency})<input className={input} inputMode="decimal" name="fromAmount" defaultValue={draft && "fromAmount" in draft ? decimalInputValue(draft.fromAmount) : undefined} required {...fieldErrorProps(state, "fromAmount")} /></label>
          <label className="text-xs text-slate-400">Način konverzije<select className={input} onChange={(event) => setConversionMethod(event.target.value as "toAmount" | "effectiveRate")} value={conversionMethod}><option value="toAmount">Odredišni iznos</option><option value="effectiveRate">Efektivni kurs</option></select></label>
          {conversionMethod === "toAmount"
            ? <label className="text-xs text-slate-400">Odredišni iznos ({toCurrency})<input className={input} inputMode="decimal" name="toAmount" defaultValue={draft && "toAmount" in draft ? decimalInputValue(draft.toAmount) : undefined} required {...fieldErrorProps(state, "toAmount")} /></label>
            : <label className="text-xs text-slate-400">Efektivni kurs ({toCurrency}/{fromCurrency})<input className={input} inputMode="decimal" name="effectiveRate" defaultValue={draft && "effectiveRate" in draft ? decimalInputValue(draft.effectiveRate) : undefined} required {...fieldErrorProps(state, "effectiveRate")} /></label>}
        </> : null}
        {transaction && operation === "transfer" && draft && "feeAmount" in draft ? <>
          <label className="text-xs text-slate-400">Naknada prenosa ({fromCurrency})<input className={input} name="feeAmount" inputMode="decimal" defaultValue={decimalInputValue(draft.feeAmount)} {...fieldErrorProps(state, "feeAmount")} /></label>
          <label className="text-xs text-slate-400">Kategorija naknade<select className={input} name="feeCategoryId" defaultValue={draft.feeCategoryId ?? ""} {...fieldErrorProps(state, "feeCategoryId")}><option value="">Izaberi</option>{activeCategories.filter((category) => category.classification === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </> : null}
        {receivable || openingReceivable ? <label className="text-xs text-slate-400">Druga strana<input className={input} name="counterparty" defaultValue={draft && "counterparty" in draft ? draft.counterparty : undefined} placeholder="Ime osobe ili firme koja ti duguje" required {...fieldErrorProps(state, "counterparty")} /></label> : null}
        <label className="text-xs text-slate-400">Datum<Input className={input} name="occurredAt" type="date" defaultValue={transaction ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(transaction.occurredAt) : undefined} /></label>
        <label className="text-xs text-slate-400 sm:col-span-2">Opis<input className={input} name={transaction ? "replacementDescription" : "description"} defaultValue={transaction?.description ?? undefined} /></label>
      </div>
      <button className="mt-4 min-h-11 action-button rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{transaction ? "Sačuvaj izmene" : "Sačuvaj transakciju"}</button>
      <ActionMessage state={state} success={transaction ? "Transakcija je izmenjena." : "Transakcija je sačuvana."} />
    </form>
  );
}
