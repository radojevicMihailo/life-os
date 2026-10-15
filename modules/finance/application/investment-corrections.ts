import Decimal from "decimal.js";
import { eq } from "drizzle-orm";
import type { ApplicationDependencies } from "./ports";
import { applicationError } from "./ports";
import { persistTransactionBuild } from "./transactions";
import { AccountsRepository, type AccountRecord } from "../db/repositories/accounts";
import { InvestmentsRepository, type InstrumentRecord, type InvestmentAccountRecord } from "../db/repositories/investments";
import { LedgerRepository } from "../db/repositories/ledger";
import { currencies } from "../db/schema";
import { defineCurrency, Money, Quantity, Rate, normalizeSignedMoneyAmount } from "../domain/money";
import { DomainError } from "../domain/errors";
import { reverseJournal, type JournalDraft } from "../domain/ledger";
import { disposeFifo } from "../domain/investments";

const ExactDecimal = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });

export interface CorrectInvestmentTransactionInput {
  originalId: string;
  investmentAccountId: string;
  instrumentId: string;
  quantity: string;
  /** Total acquisition cost or gross sale proceeds, excluding fees. */
  grossAmount: string;
  feeAmount: string;
  tradeCurrencyCode: string;
  tradeFxRateToEur: string;
  occurredAt: Date;
  preserveTimeOnSameDate?: boolean;
}

function posting(account: AccountRecord, amount: string) {
  return { account, amount, currencyCode: account.currencyCode };
}

export async function correctInvestmentTransaction(
  deps: ApplicationDependencies,
  input: CorrectInvestmentTransactionInput,
): Promise<{ id: string }> {
  return deps.unitOfWork.run(async (tx) => {
    const investments = new InvestmentsRepository(tx);
    const accounts = new AccountsRepository(tx);
    const ledger = new LedgerRepository(tx);
    // Read before taking locks so every operation follows instrument -> broker -> cash.
    // The original is re-read under lock after the shared serialization locks.
    const snapshot = await investments.getTransaction(input.originalId);
    const instruments = new Map<string, InstrumentRecord>();
    for (const id of [...new Set([snapshot.instrumentId, input.instrumentId])].sort()) {
      instruments.set(id, await investments.lockInstrument(id));
    }
    const brokers = new Map<string, InvestmentAccountRecord>();
    for (const id of [...new Set([snapshot.investmentAccountId, input.investmentAccountId])].sort()) {
      brokers.set(id, await investments.lockInvestmentAccount(id));
    }
    const cashAccounts = await accounts.lockByIds([...brokers.values()].map((row) => row.cashAccountId));
    const original = await investments.getTransaction(input.originalId, true);
    if (original.status !== "posted" || original.correctedById) {
      applicationError("investment_transaction_already_corrected");
    }
    if (original.type !== "buy" && original.type !== "sell") {
      applicationError("investment_transaction_correction_unsupported");
    }
    if (original.type === "sell" && !original.journalTransactionId) {
      applicationError("investment_transaction_correction_unsupported");
    }
    const opening = original.journalTransactionId === null;
    const targetBroker = brokers.get(input.investmentAccountId)!;
    const cash = cashAccounts.find((row) => row.id === targetBroker.cashAccountId);
    if (!cash || !cash.isActive) applicationError("account_inactive");
    if (cash.classification !== "asset") applicationError("transaction_account_classification_mismatch");
    const code = input.tradeCurrencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) applicationError("currency_invalid");
    if (!opening && cash.currencyCode !== code) applicationError("investment_cash_currency_mismatch");
    const [currency] = await tx.select().from(currencies).where(eq(currencies.code, code));
    if (!currency?.isActive) applicationError("currency_not_found");
    const currencyDefinition = defineCurrency({ code, minorUnit: Number(currency.minorUnit) });
    const instrument = instruments.get(input.instrumentId)!;
    const quantity = Quantity[instrument.class](input.quantity).amount;
    const grossAmount = Money.parse(input.grossAmount, currencyDefinition).amount;
    const feeAmount = normalizeSignedMoneyAmount(input.feeAmount, currencyDefinition, { allowZero: true });
    if (new ExactDecimal(feeAmount).isNegative()) throw new DomainError("money_non_positive");
    if (original.type === "sell" && new ExactDecimal(feeAmount).gte(grossAmount)) {
      throw new DomainError("investment_fee_exceeds_amount");
    }
    const fx = Rate.parse(input.tradeFxRateToEur).value;
    if (code === "EUR" && !new ExactDecimal(fx).eq(1)) applicationError("investment_eur_fx_rate_not_identity");
    let occurredAt = input.occurredAt;
    if (input.preserveTimeOnSameDate &&
      occurredAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Belgrade" }) ===
      original.occurredAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Belgrade" })) {
      occurredAt = original.occurredAt;
    }
    const id = deps.ids.nextId("investmentTransaction");
    let journalTransactionId: string | null = null;
    if (!opening) {
      const oldJournal = await ledger.lockJournal(original.journalTransactionId!);
      if (oldJournal.correctedById || oldJournal.status !== "posted") applicationError("journal_already_corrected");
      const reversal = reverseJournal({ ...oldJournal, postings: oldJournal.postings } as JournalDraft, {
        id: deps.ids.nextId("journalTransaction"), source: "web", occurredAt: original.occurredAt,
        description: `Reversal of ${oldJournal.id}`,
      });
      await persistTransactionBuild(deps, ledger, {
        draft: reversal,
        userAccountIds: oldJournal.postings.filter((row) => !row.account.isSystem).map((row) => row.account.id),
      }, { id: reversal.id });
      const equity = await accounts.getOrCreateSystemAccount({ classification: "equity", currencyCode: code,
        minorUnit: cash.minorUnit, now: deps.clock.now(), subtype: "investment" });
      const cashDelta = (original.type === "buy"
        ? new ExactDecimal(grossAmount).plus(feeAmount).negated()
        : new ExactDecimal(grossAmount).minus(feeAmount)).toFixed(cash.minorUnit);
      const replacement = await persistTransactionBuild(deps, ledger, {
        draft: { type: "investment_trade", source: "web", occurredAt, description: oldJournal.description,
          postings: [posting(cash, cashDelta), posting(equity, new ExactDecimal(cashDelta).negated().toFixed(cash.minorUnit))] },
        userAccountIds: [cash.id],
      }, { correctionOfId: oldJournal.id });
      journalTransactionId = replacement.id;
      await ledger.updateCorrectedBy(oldJournal.id, replacement.id);
    }
    await investments.insertTransaction({ id, investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId, journalTransactionId, type: original.type, occurredAt, quantity,
      tradeCurrencyCode: code, grossAmount, feeAmount, tradeFxRateToEur: fx, correctionOfId: original.id });
    if (original.type === "buy") {
      await investments.insertLot({ id: deps.ids.nextId("taxLot"), investmentTransactionId: id,
        instrumentId: input.instrumentId, acquiredAt: occurredAt, quantity,
        costCurrencyCode: code, costAmount: grossAmount, feeAmount });
    }
    await investments.markCorrected(original.id, id);
    const pairs = new Map([
      [`${original.investmentAccountId}:${original.instrumentId}`, { investmentAccountId: original.investmentAccountId, instrumentId: original.instrumentId }],
      [`${input.investmentAccountId}:${input.instrumentId}`, { investmentAccountId: input.investmentAccountId, instrumentId: input.instrumentId }],
    ]);
    for (const [, pair] of [...pairs].sort(([a], [b]) => a.localeCompare(b))) {
      const sales = await investments.resetPairForReplay(pair);
      for (const sale of sales) {
        const lots = await investments.lockOpenLots({ ...pair, disposedAt: sale.occurredAt });
        if (lots.some((lot) => lot.costCurrencyCode !== sale.tradeCurrencyCode)) {
          applicationError("investment_trade_currency_mismatch");
        }
        const fifo = disposeFifo(lots, { assetClass: instruments.get(pair.instrumentId)!.class,
          quantity: new ExactDecimal(sale.quantity!).toFixed().replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1"),
          grossProceeds: new ExactDecimal(sale.grossAmount!).toFixed(), saleFee: new ExactDecimal(sale.feeAmount ?? "0").toFixed() });
        const remaining = new Map(fifo.remainingLots.map((lot) => [lot.id, lot.remainingQuantity]));
        await investments.applyDisposals({ investmentTransactionId: sale.id, disposedAt: sale.occurredAt,
          proceedsCurrencyCode: sale.tradeCurrencyCode,
          rows: fifo.disposals.map((row) => ({ ...row, id: deps.ids.nextId("lotDisposal"), remainingQuantity: remaining.get(row.lotId)! })) });
      }
    }
    return { id };
  });
}
