"use client";

import { Input } from "@/components/ui/input";

import { useActionState } from "react";
import { createInvestmentAccountAction, createOpeningLotAction, resolveInstrumentAction, saveInvestmentActivityAction, setOpeningSetupVisibilityAction } from "@/modules/finance/ui/actions/investments";
import { ActionMessage, fieldErrorProps } from "@/modules/finance/ui/components/action-message";

const control = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";
type Account = { id: string; name: string; classification: string; currencyCode: string; isActive: boolean };
type InvestmentAccount = { id: string; name: string; cashCurrencyCode: string };
type Instrument = { id: string; symbol: string; name: string; quoteCurrencyCode: string };

export function InvestmentAccountForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(createInvestmentAccountAction, undefined);
  return <form action={action} className="rounded-3xl border border-border bg-card p-4"><h2 className="font-semibold">Investicioni račun</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Naziv investicionog računa<input className={control} name="name" required /></label><label className="text-xs text-muted-foreground">Povezani novčani račun<select className={control} name="cashAccountId" required><option value="">Izaberi</option>{accounts.filter((item) => item.isActive && item.classification === "asset").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><p className="mt-3 text-xs text-muted-foreground">Za unos početnih pozicija ovaj račun može imati saldo 0. Početne pozicije ne skidaju novac; račun služi za novčane tokove budućih kupovina, prodaja, prihoda i naknada.</p><button className="mt-4 min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white" disabled={pending}>Kreiraj investicioni račun</button><ActionMessage state={state} success="Investicioni račun je kreiran." /></form>;
}

function OpeningLotCard({ instrument, investmentAccounts, currencies }: { instrument: Instrument; investmentAccounts: InvestmentAccount[]; currencies: Array<{ code: string; isActive: boolean }> }) {
  const [state, action, pending] = useActionState(createOpeningLotAction, undefined);
  return <form action={action} aria-label={`${instrument.symbol} početna pozicija`} className="rounded-2xl border border-border bg-muted/50 p-4">
    <input name="instrumentId" type="hidden" value={instrument.id} />
    <h3 className="font-semibold">{instrument.symbol}</h3><p className="text-xs text-muted-foreground">{instrument.name}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-muted-foreground">Investicioni račun<select className={control} name="investmentAccountId" required {...fieldErrorProps(state, "investmentAccountId")}><option value="">Izaberi</option>{investmentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Početna količina<input className={control} inputMode="decimal" placeholder="npr. 1,983" name="quantity" {...fieldErrorProps(state, "quantity")} /><span className="mt-1 block text-xs text-muted-foreground">Za decimale koristi zarez: 1,983 znači jednu akciju i deo akcije.</span></label>
      <label className="text-xs text-muted-foreground">Datum sticanja<Input className={control} name="acquiredAt" type="date" {...fieldErrorProps(state, "acquiredAt")} /></label>
      <label className="text-xs text-muted-foreground">Cena sticanja<input className={control} inputMode="decimal" name="price" {...fieldErrorProps(state, "price")} /></label>
      <label className="text-xs text-muted-foreground">Valuta sticanja<select className={control} defaultValue="" name="currencyCode" {...fieldErrorProps(state, "currencyCode")}><option value="">Izaberi</option>{currencies.filter((item) => item.isActive).map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Početne naknade<input className={control} inputMode="decimal" name="fees" {...fieldErrorProps(state, "fees")} /></label>
      <label className="text-xs text-muted-foreground">Kurs prema EUR za početni lot<input className={control} inputMode="decimal" name="tradeFxRateToEur" {...fieldErrorProps(state, "tradeFxRateToEur")} /></label>
    </div>
    <button className="mt-3 min-h-11 rounded-xl border border-blue-400/30 px-4 text-sm text-blue-700 dark:text-blue-100" disabled={pending}>Sačuvaj početni lot</button><ActionMessage state={state} success="Početna pozicija je sačuvana bez promene stanja gotovine." />
  </form>;
}

export function OpeningSetup({ instruments, investmentAccounts, currencies, initiallyHidden = false }: { instruments: Instrument[]; investmentAccounts: InvestmentAccount[]; currencies: Array<{ code: string; isActive: boolean }>; initiallyHidden?: boolean }) {
  const [state, action, pending] = useActionState(setOpeningSetupVisibilityAction, undefined);
  const hidden = state?.ok ? state.value.hidden : initiallyHidden;
  return <section className="mt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Početne pozicije</h2>
      <form action={action}>
        <input name="hidden" type="hidden" value={String(!hidden)} />
        <button className="min-h-11 rounded-xl border border-border px-4 text-sm text-foreground" disabled={pending} type="submit">{hidden ? "Prikaži početne pozicije" : "Završi početni unos"}</button>
      </form>
    </div>
    <ActionMessage state={state} success={hidden ? "Početni unos je sklonjen. Možeš ga ponovo prikazati kad ti zatreba." : "Početni unos je prikazan."} />
    <div hidden={hidden}>
      <p className="mt-1 text-sm text-muted-foreground">Polja ostaju prazna dok ne unesete stvarnu količinu, datum, cenu, valutu i naknade.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{instruments.map((instrument) => <OpeningLotCard currencies={currencies} instrument={instrument} investmentAccounts={investmentAccounts} key={instrument.id} />)}</div>
    </div>
  </section>;
}

export function InvestmentActivityForm({ instruments, investmentAccounts }: { instruments: Instrument[]; investmentAccounts: InvestmentAccount[] }) {
  const [state, action, pending] = useActionState(saveInvestmentActivityAction, undefined);
  return <form action={action} className="rounded-3xl border border-border bg-card p-4"><h2 className="text-xl font-semibold tracking-tight text-foreground">Kupovina, prodaja, dividenda ili naknada</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-muted-foreground">Investiciona operacija<select className={control} name="operation"><option value="buy">Kupovina</option><option value="sell">Prodaja</option><option value="dividend">Dividenda</option><option value="fee">Naknada</option></select></label><label className="text-xs text-muted-foreground">Investicioni račun aktivnosti<select className={control} name="investmentAccountId" required><option value="">Izaberi</option>{investmentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs text-muted-foreground">Investicioni instrument<select className={control} name="instrumentId" required><option value="">Izaberi</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} · {item.name}</option>)}</select></label><label className="text-xs text-muted-foreground">Količina investicije<input className={control} inputMode="decimal" name="quantity" /></label><label className="text-xs text-muted-foreground">Bruto iznos investicije<input className={control} inputMode="decimal" name="amount" required /></label><label className="text-xs text-muted-foreground">Naknada investicije<input className={control} defaultValue="0" inputMode="decimal" name="fees" /></label><label className="text-xs text-muted-foreground">Valuta trgovine<input className={control} defaultValue="EUR" maxLength={3} name="tradeCurrencyCode" /></label><label className="text-xs text-muted-foreground">Kurs investicije prema EUR<input className={control} defaultValue="1" inputMode="decimal" name="tradeFxRateToEur" /></label><label className="text-xs text-muted-foreground">Datum investicije<Input className={control} name="occurredAt" type="datetime-local" /></label><label className="text-xs text-muted-foreground">Opis investicije<input className={control} name="description" /></label></div><button className="mt-4 min-h-11 action-button rounded-xl px-4 text-sm font-semibold text-white" disabled={pending}>Sačuvaj investicionu aktivnost</button><ActionMessage state={state} success="Investiciona aktivnost je sačuvana." /></form>;
}

export function ResolveInstrumentForm() {
  const [state, action, pending] = useActionState(resolveInstrumentAction, undefined);
  return <form action={action} className="rounded-3xl border border-border bg-card p-4"><h2 className="font-semibold">Dodaj potvrđeni instrument</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-muted-foreground">Simbol<input className={control} name="symbol" required /></label><label className="text-xs text-muted-foreground">Naziv instrumenta<input className={control} name="name" required /></label><label className="text-xs text-muted-foreground">Klasa<select className={control} name="class"><option value="stock">Akcija</option><option value="etf">ETF</option><option value="crypto">Kripto</option></select></label><label className="text-xs text-muted-foreground">Valuta kotacije<input className={control} defaultValue="EUR" name="quoteCurrencyCode" /></label><label className="text-xs text-muted-foreground">Izvor instrumenta<select className={control} name="provider"><option value="alpha_vantage">Alpha Vantage</option><option value="coingecko">CoinGecko</option></select></label><label className="text-xs text-muted-foreground">Oznaka kod izvora cena<input className={control} name="providerId" title="Identifikator instrumenta kod izabranog izvora, npr. bitcoin za CoinGecko ili simbol akcije kod Alpha Vantage." placeholder="npr. bitcoin ili AAPL" /></label><label className="text-xs text-muted-foreground">ISIN<input className={control} name="isin" /></label><label className="text-xs text-muted-foreground">Berza<select className={control} name="exchange" defaultValue=""><option value="">Izaberi berzu</option><option value="NASDAQ">NASDAQ</option><option value="IBIS">IBIS · Xetra</option><option value="IBIS2">IBIS2 · Xetra ETF</option><option value="Xetra">Xetra</option></select></label></div><button className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm" disabled={pending}>Proveri cenu i dodaj</button><ActionMessage state={state} success="Izvor je potvrdio instrument i cenu." /></form>;
}
