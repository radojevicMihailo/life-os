"use client";

import { useActionState, useState } from "react";

import { createTransactionAction } from "@/modules/finance/ui/actions/transactions";
import { ActionMessage, fieldErrorProps } from "@/modules/finance/ui/components/action-message";

type Option = { id: string; name: string; classification: string; currencyCode?: string; isActive: boolean };

const input = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";

export function TransactionForm({ accounts, categories }: { accounts: Option[]; categories: Option[] }) {
  const [state, action, pending] = useActionState(createTransactionAction, undefined);
  const [operation, setOperation] = useState("expense");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [conversionMethod, setConversionMethod] = useState<"toAmount" | "effectiveRate">("toAmount");
  const activeAccounts = accounts.filter((account) => account.isActive);
  const activeCategories = categories.filter((category) => category.isActive);
  const standard = ["income", "expense", "opening_balance", "credit_card_purchase"].includes(operation);
  const transfer = ["transfer", "credit_card_repayment"].includes(operation);
  const receivable = ["receivable_out", "receivable_repayment"].includes(operation);
  const fromCurrency = activeAccounts.find((account) => account.id === fromAccountId)?.currencyCode;
  const toCurrency = activeAccounts.find((account) => account.id === toAccountId)?.currencyCode;
  const transferAccountsSelected = Boolean(fromCurrency && toCurrency);
  const foreignTransfer = operation === "transfer" && transferAccountsSelected && fromCurrency !== toCurrency;
  const sameCurrencyTransfer = operation === "transfer" && transferAccountsSelected && fromCurrency === toCurrency;

  return (
    <form action={action} className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Nova transakcija</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">Operacija<select className={input} name="operation" onChange={(event) => setOperation(event.target.value)} value={operation}>{[
          ["expense", "Trošak"], ["income", "Prihod"], ["transfer", "Prenos / menjačnica"], ["opening_balance", "Početno stanje"], ["credit_card_purchase", "Kupovina karticom"], ["credit_card_repayment", "Otplata kartice"], ["receivable_out", "Pozajmica"], ["receivable_repayment", "Vraćena pozajmica"],
        ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {standard ? <label className="text-xs text-slate-400">Račun<select className={input} name="accountId" required {...fieldErrorProps(state, "accountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}
        {transfer || operation === "receivable_out" ? <label className="text-xs text-slate-400">Račun sa kog se plaća<select className={input} name="fromAccountId" onChange={(event) => setFromAccountId(event.target.value)} required value={fromAccountId} {...fieldErrorProps(state, "fromAccountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currencyCode}</option>)}</select></label> : null}
        {transfer || operation === "receivable_repayment" ? <label className="text-xs text-slate-400">Odredišni račun<select className={input} name="toAccountId" onChange={(event) => setToAccountId(event.target.value)} required value={toAccountId} {...fieldErrorProps(state, "toAccountId")}><option value="">Izaberi</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currencyCode}</option>)}</select></label> : null}
        {receivable ? <label className="text-xs text-slate-400">Račun potraživanja<select className={input} name="receivableAccountId" required {...fieldErrorProps(state, "receivableAccountId")}><option value="">Izaberi</option>{activeAccounts.filter((account) => account.classification === "receivable").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}
        {["income", "expense", "credit_card_purchase"].includes(operation) ? <label className="text-xs text-slate-400">Kategorija<select className={input} name="categoryId" required {...fieldErrorProps(state, "categoryId")}><option value="">Izaberi</option>{activeCategories.filter((category) => category.classification === (operation === "income" ? "income" : "expense")).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label> : null}
        {operation !== "transfer" ? <label className="text-xs text-slate-400">Iznos<input className={input} inputMode="decimal" name="amount" required {...fieldErrorProps(state, "amount")} /></label> : null}
        {operation === "transfer" && !transferAccountsSelected ? <p className="self-end text-xs text-slate-400">Izaberite oba računa da bi se prikazala odgovarajuća polja iznosa.</p> : null}
        {sameCurrencyTransfer ? <label className="text-xs text-slate-400">Iznos prenosa ({fromCurrency})<input className={input} inputMode="decimal" name="amount" required {...fieldErrorProps(state, "amount")} /></label> : null}
        {foreignTransfer ? <>
          <label className="text-xs text-slate-400">Izvorni iznos ({fromCurrency})<input className={input} inputMode="decimal" name="fromAmount" required {...fieldErrorProps(state, "fromAmount")} /></label>
          <label className="text-xs text-slate-400">Način konverzije<select className={input} onChange={(event) => setConversionMethod(event.target.value as "toAmount" | "effectiveRate")} value={conversionMethod}><option value="toAmount">Odredišni iznos</option><option value="effectiveRate">Efektivni kurs</option></select></label>
          {conversionMethod === "toAmount"
            ? <label className="text-xs text-slate-400">Odredišni iznos ({toCurrency})<input className={input} inputMode="decimal" name="toAmount" required {...fieldErrorProps(state, "toAmount")} /></label>
            : <label className="text-xs text-slate-400">Efektivni kurs ({toCurrency}/{fromCurrency})<input className={input} inputMode="decimal" name="effectiveRate" required {...fieldErrorProps(state, "effectiveRate")} /></label>}
        </> : null}
        {receivable ? <label className="text-xs text-slate-400">Druga strana<input className={input} name="counterparty" required {...fieldErrorProps(state, "counterparty")} /></label> : null}
        <label className="text-xs text-slate-400">Datum i vreme<input className={input} name="occurredAt" type="datetime-local" /></label>
        <label className="text-xs text-slate-400 sm:col-span-2">Opis<input className={input} name="description" /></label>
      </div>
      <button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={pending} type="submit">Sačuvaj transakciju</button>
      <ActionMessage state={state} success="Transakcija je sačuvana." />
    </form>
  );
}
