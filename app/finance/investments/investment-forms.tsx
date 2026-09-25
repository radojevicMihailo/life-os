"use client";

import { useActionState } from "react";
import { createInvestmentAccountAction, createOpeningLotAction, resolveInstrumentAction, saveInvestmentActivityAction } from "@/modules/finance/ui/actions/investments";
import { ActionMessage, fieldErrorProps } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white";
type Account = { id: string; name: string; classification: string; currencyCode: string; isActive: boolean };
type InvestmentAccount = { id: string; name: string; cashCurrencyCode: string };
type Instrument = { id: string; symbol: string; name: string; quoteCurrencyCode: string };

export function InvestmentAccountForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(createInvestmentAccountAction, undefined);
  return <form action={action} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><h2 className="font-semibold">Investicioni račun</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Naziv investicionog računa<input className={control} name="name" required /></label><label className="text-xs text-slate-400">Novčani račun brokera<select className={control} name="cashAccountId" required><option value="">Izaberi</option>{accounts.filter((item) => item.isActive && item.classification === "asset").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950" disabled={pending}>Kreiraj investicioni račun</button><ActionMessage state={state} success="Investicioni račun je kreiran." /></form>;
}

function OpeningLotCard({ instrument, investmentAccounts, currencies }: { instrument: Instrument; investmentAccounts: InvestmentAccount[]; currencies: Array<{ code: string; isActive: boolean }> }) {
  const [state, action, pending] = useActionState(createOpeningLotAction, undefined);
  return <form action={action} aria-label={`${instrument.symbol} početna pozicija`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
    <input name="instrumentId" type="hidden" value={instrument.id} />
    <h3 className="font-semibold">{instrument.symbol}</h3><p className="text-xs text-slate-500">{instrument.name}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-slate-400">Investicioni račun<select className={control} name="investmentAccountId" required {...fieldErrorProps(state, "investmentAccountId")}><option value="">Izaberi</option>{investmentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs text-slate-400">Početna količina<input className={control} inputMode="decimal" name="quantity" {...fieldErrorProps(state, "quantity")} /></label>
      <label className="text-xs text-slate-400">Datum sticanja<input className={control} name="acquiredAt" type="date" {...fieldErrorProps(state, "acquiredAt")} /></label>
      <label className="text-xs text-slate-400">Cena sticanja<input className={control} inputMode="decimal" name="price" {...fieldErrorProps(state, "price")} /></label>
      <label className="text-xs text-slate-400">Valuta sticanja<select className={control} defaultValue="" name="currencyCode" {...fieldErrorProps(state, "currencyCode")}><option value="">Izaberi</option>{currencies.filter((item) => item.isActive).map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
      <label className="text-xs text-slate-400">Početne naknade<input className={control} inputMode="decimal" name="fees" {...fieldErrorProps(state, "fees")} /></label>
      <label className="text-xs text-slate-400">Kurs prema EUR za početni lot<input className={control} inputMode="decimal" name="tradeFxRateToEur" {...fieldErrorProps(state, "tradeFxRateToEur")} /></label>
    </div>
    <button className="mt-3 min-h-11 rounded-xl border border-teal-300/30 px-4 text-sm text-teal-100" disabled={pending}>Sačuvaj početni lot</button><ActionMessage state={state} success="Početni lot je sačuvan bez izmišljenog toka gotovine." />
  </form>;
}

export function OpeningSetup({ instruments, investmentAccounts, currencies }: { instruments: Instrument[]; investmentAccounts: InvestmentAccount[]; currencies: Array<{ code: string; isActive: boolean }> }) {
  return <section className="mt-6"><h2 className="text-xl font-semibold">Početne pozicije</h2><p className="mt-1 text-sm text-slate-400">Polja ostaju prazna dok ne unesete stvarnu količinu, datum, cenu, valutu i naknade.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{instruments.map((instrument) => <OpeningLotCard currencies={currencies} instrument={instrument} investmentAccounts={investmentAccounts} key={instrument.id} />)}</div></section>;
}

export function InvestmentActivityForm({ instruments, investmentAccounts }: { instruments: Instrument[]; investmentAccounts: InvestmentAccount[] }) {
  const [state, action, pending] = useActionState(saveInvestmentActivityAction, undefined);
  return <form action={action} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><h2 className="font-semibold">Kupovina, prodaja, dividenda ili naknada</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">Investiciona operacija<select className={control} name="operation"><option value="buy">Kupovina</option><option value="sell">Prodaja</option><option value="dividend">Dividenda</option><option value="fee">Naknada</option></select></label><label className="text-xs text-slate-400">Investicioni račun aktivnosti<select className={control} name="investmentAccountId" required><option value="">Izaberi</option>{investmentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs text-slate-400">Investicioni instrument<select className={control} name="instrumentId" required><option value="">Izaberi</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} · {item.name}</option>)}</select></label><label className="text-xs text-slate-400">Količina investicije<input className={control} inputMode="decimal" name="quantity" /></label><label className="text-xs text-slate-400">Bruto iznos investicije<input className={control} inputMode="decimal" name="amount" required /></label><label className="text-xs text-slate-400">Naknada investicije<input className={control} defaultValue="0" inputMode="decimal" name="fees" /></label><label className="text-xs text-slate-400">Valuta trgovine<input className={control} defaultValue="EUR" maxLength={3} name="tradeCurrencyCode" /></label><label className="text-xs text-slate-400">Kurs investicije prema EUR<input className={control} defaultValue="1" inputMode="decimal" name="tradeFxRateToEur" /></label><label className="text-xs text-slate-400">Datum investicije<input className={control} name="occurredAt" type="datetime-local" /></label><label className="text-xs text-slate-400">Opis investicije<input className={control} name="description" /></label></div><button className="mt-4 min-h-11 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950" disabled={pending}>Sačuvaj investicionu aktivnost</button><ActionMessage state={state} success="Investiciona aktivnost je sačuvana atomarno." /></form>;
}

export function ResolveInstrumentForm() {
  const [state, action, pending] = useActionState(resolveInstrumentAction, undefined);
  return <form action={action} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><h2 className="font-semibold">Dodaj potvrđeni instrument</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">Simbol<input className={control} name="symbol" required /></label><label className="text-xs text-slate-400">Naziv instrumenta<input className={control} name="name" required /></label><label className="text-xs text-slate-400">Klasa<select className={control} name="class"><option value="stock">Akcija</option><option value="etf">ETF</option><option value="crypto">Kripto</option></select></label><label className="text-xs text-slate-400">Valuta kotacije<input className={control} defaultValue="EUR" name="quoteCurrencyCode" /></label><label className="text-xs text-slate-400">Izvor instrumenta<select className={control} name="provider"><option value="alpha_vantage">Alpha Vantage</option><option value="coingecko">CoinGecko</option></select></label><label className="text-xs text-slate-400">Stabilni provider ID<input className={control} name="providerId" /></label><label className="text-xs text-slate-400">ISIN<input className={control} name="isin" /></label><label className="text-xs text-slate-400">Berza<input className={control} name="exchange" /></label></div><button className="mt-4 min-h-11 rounded-xl border border-white/10 px-4 text-sm" disabled={pending}>Proveri cenu i dodaj</button><ActionMessage state={state} success="Izvor je potvrdio instrument i cenu." /></form>;
}
