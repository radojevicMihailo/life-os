"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { correctInvestmentTransactionAction } from "@/modules/finance/ui/actions/investments";
import { ActionMessage, fieldErrorProps } from "@/modules/finance/ui/components/action-message";
import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";

export type EditableInvestmentActivity = {
  id: string; instrumentId: string; investmentAccountId: string;
  journalTransactionId: string | null; type: string; symbol: string;
  occurredAt: Date; quantity: string | null; grossAmount: string | null;
  feeAmount: string | null; tradeCurrencyCode: string; tradeFxRateToEur: string;
};

type Account = { id: string; name: string; cashCurrencyCode: string };
type Instrument = { id: string; symbol: string; name: string; quoteCurrencyCode: string };
const control = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";

export function InvestmentCorrectionForm({ activity, accounts, instruments, currencies, label = "Izmeni" }: {
  activity: EditableInvestmentActivity; accounts: Account[]; instruments: Instrument[];
  currencies: Array<{ code: string; isActive: boolean }>; label?: string;
}) {
  const [state, action, pending] = useActionState(correctInvestmentTransactionAction, undefined);
  const [accountId, setAccountId] = useState(activity.investmentAccountId);
  const [fx, setFx] = useState(decimalInputValue(activity.tradeFxRateToEur));
  if ((activity.type !== "buy" && activity.type !== "sell") || !activity.quantity || !activity.grossAmount) return null;
  const opening = activity.type === "buy" && activity.journalTransactionId === null;
  const currency = accounts.find((account) => account.id === accountId)?.cashCurrencyCode ?? activity.tradeCurrencyCode;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(activity.occurredAt);
  return <details className="mt-3 w-full text-left">
    <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium text-blue-700 dark:text-blue-200">{label}</summary>
    <form action={action} aria-label={`Izmena ${activity.symbol} ${date}`} className="mt-2 rounded-2xl border border-border bg-muted/50 p-4">
      <input name="originalId" type="hidden" value={activity.id} />
      <p className="mb-3 text-sm font-medium">{opening ? "Izmeni početni unos" : activity.type === "buy" ? "Izmeni kupovinu" : "Izmeni prodaju"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Investicioni račun<select className={control} name="investmentAccountId" required value={accountId} onChange={(event) => {
          setAccountId(event.target.value);
          if (!opening) {
            const nextCurrency = accounts.find((account) => account.id === event.target.value)?.cashCurrencyCode;
            setFx(nextCurrency === "EUR" ? "1" : nextCurrency === activity.tradeCurrencyCode ? decimalInputValue(activity.tradeFxRateToEur) : "");
          }
        }} {...fieldErrorProps(state, "investmentAccountId")}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.cashCurrencyCode}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Instrument<select className={control} name="instrumentId" defaultValue={activity.instrumentId} required {...fieldErrorProps(state, "instrumentId")}>{instruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.symbol} · {instrument.quoteCurrencyCode}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Količina<input className={control} name="quantity" inputMode="decimal" defaultValue={decimalInputValue(activity.quantity)} required {...fieldErrorProps(state, "quantity")} /></label>
        <label className="text-xs text-muted-foreground">Ukupan iznos bez naknade<input className={control} name="grossAmount" inputMode="decimal" defaultValue={decimalInputValue(activity.grossAmount)} required {...fieldErrorProps(state, "grossAmount")} /></label>
        <label className="text-xs text-muted-foreground">Naknada<input className={control} name="feeAmount" inputMode="decimal" defaultValue={decimalInputValue(activity.feeAmount ?? "0")} required {...fieldErrorProps(state, "feeAmount")} /></label>
        <label className="text-xs text-muted-foreground">Valuta iznosa{opening
          ? <select className={control} name="tradeCurrencyCode" defaultValue={activity.tradeCurrencyCode} required {...fieldErrorProps(state, "tradeCurrencyCode")}>{currencies.filter((item) => item.isActive).map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select>
          : <input className={control} name="tradeCurrencyCode" readOnly value={currency} {...fieldErrorProps(state, "tradeCurrencyCode")} />}</label>
        <label className="text-xs text-muted-foreground">Kurs prema EUR<input className={control} name="tradeFxRateToEur" inputMode="decimal" value={fx} onChange={(event) => setFx(event.target.value)} required {...fieldErrorProps(state, "tradeFxRateToEur")} /></label>
        <label className="text-xs text-muted-foreground">Datum<Input className={control} name="occurredAt" type="date" defaultValue={date} {...fieldErrorProps(state, "occurredAt")} /></label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{opening ? "Ovaj unos ne menja gotovinu." : "Gotovina i povezani obračuni biće preračunati."} Unesi ukupan iznos za celu količinu, bez naknade.</p>
      <button className="mt-4 min-h-11 action-button rounded-xl px-4 text-sm text-white" disabled={pending} type="submit">Sačuvaj izmene</button>
      <ActionMessage state={state} success="Izmena je sačuvana. Pozicija i povezani obračuni su ažurirani." />
    </form>
  </details>;
}
