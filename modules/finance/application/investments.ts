import Decimal from "decimal.js";
import { eq } from "drizzle-orm";

import { DomainError } from "../domain/errors";
import type { JournalDraft, LedgerAccount } from "../domain/ledger";
import { disposeFifo, type ActiveInvestmentClass } from "../domain/investments";
import {
  defineCurrency,
  Money,
  normalizeSignedMoneyAmount,
  Quantity,
  Rate,
} from "../domain/money";
import { AccountsRepository, type AccountRecord } from "../db/repositories/accounts";
import { CategoriesRepository } from "../db/repositories/categories";
import {
  InvestmentsRepository,
  type InstrumentRecord,
} from "../db/repositories/investments";
import { LedgerRepository } from "../db/repositories/ledger";
import type { DbTx } from "../db/client";
import { currencies } from "../db/schema";
import type { MarketQuoteProvider } from "./valuation";
import {
  applicationError,
  type ApplicationDependencies,
  type TransactionSummary,
} from "./ports";
import { recomputeBudgetSeriesForDrafts } from "./budgets";
import { persistTransactionBuild } from "./transactions";

const ExactDecimal = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });

export interface ValuationSourceMetadata {
  kind: "automatic" | "manual";
  provider: string;
  effectiveAt: Date;
  retrievedAt?: Date;
}

export interface TradeValuationInput {
  quote: {
    price: string;
    currencyCode: string;
    source: ValuationSourceMetadata;
  };
  reportingFx: {
    rate: string;
    baseCurrencyCode: string;
    quoteCurrencyCode: "EUR";
    source: ValuationSourceMetadata;
  };
}

interface InvestmentOperationBase {
  investmentAccountId: string;
  instrumentId: string;
  tradeCurrencyCode: string;
  tradeFxRateToEur: string;
  occurredAt?: Date;
  description?: string | null;
}

export interface BuyInvestmentInput extends InvestmentOperationBase {
  quantity: string;
  grossAmount: string;
  feeAmount?: string;
}

export interface SellInvestmentInput extends InvestmentOperationBase {
  quantity: string;
  grossAmount: string;
  feeAmount?: string;
}

export interface RecordDividendInput extends InvestmentOperationBase {
  grossAmount: string;
}

export interface RecordInvestmentFeeInput extends InvestmentOperationBase {
  feeAmount: string;
}

export interface GetPositionPerformanceInput {
  investmentAccountId: string;
  instrumentId: string;
  valuation: TradeValuationInput;
}

export interface CreateInvestmentAccountInput {
  name: string;
  cashAccountId: string;
  provider?: string;
}

export interface RecordOpeningLotInput {
  investmentAccountId: string;
  instrumentId: string;
  quantity: string;
  acquiredAt: Date;
  price: string;
  currencyCode: string;
  fees: string;
  tradeFxRateToEur: string;
}

export interface ResolveInstrumentInput {
  symbol: string;
  name: string;
  class: ActiveInvestmentClass;
  quoteCurrencyCode: string;
  provider: "alpha_vantage" | "coingecko";
  providerId?: string;
  isin?: string;
  exchange?: string;
}

export interface InvestmentTransactionSummary {
  id: string;
  type: "buy" | "sell" | "dividend" | "fee";
  investmentAccountId: string;
  instrumentId: string;
  occurredAt: Date;
  quantity?: string;
  tradeCurrencyCode: string;
  grossAmount?: string;
  feeAmount?: string;
  tradeFxRateToEur: string;
  journalTransaction: TransactionSummary;
}

export interface BuyInvestmentSummary extends InvestmentTransactionSummary {
  type: "buy";
  quantity: string;
  grossAmount: string;
  feeAmount: string;
  lotId: string;
}

export interface SellInvestmentSummary extends InvestmentTransactionSummary {
  type: "sell";
  quantity: string;
  grossAmount: string;
  feeAmount: string;
  disposals: Array<{
    id: string;
    lotId: string;
    quantity: string;
    proceedsAmount: string;
    costBasisAmount: string;
  }>;
  netProceeds: string;
  costBasis: string;
  realizedReturn: string;
}

type LockedContext = {
  instrument: InstrumentRecord;
  cash: AccountRecord;
  investments: InvestmentsRepository;
  accounts: AccountsRepository;
};

function canonical(decimal: Decimal, scale = 18) {
  return decimal
    .toFixed(scale)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function normalizeCurrencyCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    applicationError("currency_invalid");
  }
  return normalized;
}

function normalizedRequiredText(value: string) {
  const normalized = value.trim();
  if (!normalized) applicationError("investment_provider_resolution_failed");
  return normalized;
}

export async function createInvestmentAccount(
  deps: ApplicationDependencies,
  input: CreateInvestmentAccountInput,
) {
  return deps.unitOfWork.run(async (tx) => {
    const cash = (await new AccountsRepository(tx).lockByIds([input.cashAccountId]))[0];
    if (!cash) applicationError("account_not_found");
    if (!cash.isActive) applicationError("account_inactive");
    if (cash.classification !== "asset") applicationError("transaction_account_classification_mismatch");
    return new InvestmentsRepository(tx).createInvestmentAccount({
      id: deps.ids.nextId("investmentAccount"),
      name: normalizedRequiredText(input.name),
      cashAccountId: cash.id,
      ...(input.provider?.trim() ? { provider: input.provider.trim() } : {}),
      now: deps.clock.now(),
    });
  });
}

export async function recordOpeningLot(
  deps: ApplicationDependencies,
  input: RecordOpeningLotInput,
) {
  return deps.unitOfWork.run(async (tx) => {
    const investments = new InvestmentsRepository(tx);
    await investments.lockInvestmentAccount(input.investmentAccountId);
    const instrument = await investments.lockInstrument(input.instrumentId);
    const code = normalizeCurrencyCode(input.currencyCode);
    const [currency] = await tx.select({ minorUnit: currencies.minorUnit, isActive: currencies.isActive })
      .from(currencies).where(eq(currencies.code, code)).for("update");
    if (!currency) applicationError("currency_not_found");
    if (!currency.isActive) applicationError("currency_not_found");
    const minorUnit = Number(currency.minorUnit);
    const quantity = normalizeQuantity(input.quantity, instrument.class);
    const price = Money.parse(input.price, defineCurrency({ code, minorUnit })).amount;
    const fees = normalizeSignedMoneyAmount(
      input.fees,
      defineCurrency({ code, minorUnit }),
      { allowZero: true },
    );
    if (new ExactDecimal(fees).isNegative()) {
      throw new DomainError("money_non_positive");
    }
    const costAmount = new Decimal(quantity).times(price).toDecimalPlaces(minorUnit).toFixed(minorUnit);
    const fx = normalizeFxRateToEur(input.tradeFxRateToEur, code);
    const id = deps.ids.nextId("investmentTransaction");
    const lotId = deps.ids.nextId("taxLot");
    await investments.insertTransaction({
      id,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      journalTransactionId: null,
      type: "buy",
      occurredAt: input.acquiredAt,
      quantity,
      tradeCurrencyCode: code,
      grossAmount: costAmount,
      feeAmount: fees,
      tradeFxRateToEur: fx,
    });
    await investments.insertLot({
      id: lotId,
      investmentTransactionId: id,
      instrumentId: input.instrumentId,
      acquiredAt: input.acquiredAt,
      quantity,
      costCurrencyCode: code,
      costAmount,
      feeAmount: fees,
    });
    return { id, lotId, quantity, costAmount, feeAmount: fees, tradeFxRateToEur: fx };
  });
}

export async function resolveInstrument(
  deps: ApplicationDependencies,
  input: ResolveInstrumentInput,
  provider: MarketQuoteProvider,
) {
  if (provider.provider !== input.provider) applicationError("investment_provider_mismatch");
  const id = deps.ids.nextId("instrument");
  const symbol = normalizedRequiredText(input.symbol).toUpperCase();
  const quoteCurrencyCode = normalizeCurrencyCode(input.quoteCurrencyCode);
  let providerId = input.providerId?.trim();
  if (input.class === "crypto") {
    if (!providerId) applicationError("investment_provider_resolution_failed");
  } else {
    if (!provider.resolveSymbol) applicationError("investment_provider_resolution_failed");
    const resolved = await provider.resolveSymbol({
      instrumentId: id,
      symbol,
      quoteCurrencyCode,
      isin: input.isin?.trim() || null,
      exchange: input.exchange?.trim() || null,
    });
    if (normalizeCurrencyCode(resolved.currencyCode) !== quoteCurrencyCode) {
      applicationError("investment_trade_currency_mismatch");
    }
    providerId = resolved.providerId.trim();
  }
  if (!providerId) applicationError("investment_provider_resolution_failed");
  const quoteResult = await provider.fetchQuotes([{ instrumentId: id, providerId, quoteCurrencyCode }]);
  const quote = quoteResult.quotes[0];
  if (
    quoteResult.quotes.length !== 1 ||
    quote?.instrumentId !== id ||
    quote.providerId !== providerId ||
    normalizeCurrencyCode(quote.quoteCurrencyCode) !== quoteCurrencyCode ||
    quote.provider !== provider.provider
  ) {
    applicationError("investment_provider_resolution_failed");
  }
  try {
    Rate.parse(quote.price);
  } catch {
    applicationError("investment_provider_resolution_failed");
  }
  return deps.unitOfWork.run(async (tx) => {
    await new AccountsRepository(tx).activateCurrency(quoteCurrencyCode, deps.clock.now());
    return new InvestmentsRepository(tx).createInstrument({
      id,
      symbol,
      name: normalizedRequiredText(input.name),
      class: input.class,
      quoteCurrencyCode,
      provider: input.provider,
      providerId,
      ...(input.isin?.trim() ? { isin: input.isin.trim() } : {}),
      ...(input.exchange?.trim() ? { exchange: input.exchange.trim() } : {}),
      now: deps.clock.now(),
    });
  });
}

function normalizeQuantity(value: string, assetClass: ActiveInvestmentClass) {
  switch (assetClass) {
    case "stock":
      return Quantity.stock(value).amount;
    case "etf":
      return Quantity.etf(value).amount;
    case "crypto":
      return Quantity.crypto(value).amount;
  }
}

function accountCurrency(account: AccountRecord) {
  return defineCurrency({ code: account.currencyCode, minorUnit: account.minorUnit });
}

function normalizeMoney(value: string, account: AccountRecord) {
  return Money.parse(value, accountCurrency(account)).amount;
}

function normalizeNonNegativeMoney(value: string, account: AccountRecord) {
  const normalized = normalizeSignedMoneyAmount(value, accountCurrency(account), {
    allowZero: true,
  });

  if (new ExactDecimal(normalized).isNegative()) {
    throw new DomainError("money_non_positive");
  }

  return normalized;
}

function normalizeFxRateToEur(value: string, baseCurrencyCode: string) {
  const normalized = Rate.parse(value).value;

  if (
    normalizeCurrencyCode(baseCurrencyCode) === "EUR" &&
    !new ExactDecimal(normalized).eq(1)
  ) {
    applicationError("investment_eur_fx_rate_not_identity");
  }

  return normalized;
}

function ledgerAccount(account: AccountRecord): LedgerAccount {
  return {
    id: account.id,
    classification: account.classification,
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
  };
}

function posting(account: AccountRecord, amount: string, categoryId?: string) {
  return {
    account: ledgerAccount(account),
    currencyCode: account.currencyCode,
    amount,
    ...(categoryId ? { categoryId } : {}),
  };
}

function negate(amount: string, account: AccountRecord) {
  return new ExactDecimal(amount).negated().toFixed(account.minorUnit);
}

function sumMoney(left: string, right: string, account: AccountRecord) {
  return new ExactDecimal(left).plus(right).toFixed(account.minorUnit);
}

async function lockContext(
  tx: DbTx,
  input: Pick<InvestmentOperationBase, "investmentAccountId" | "instrumentId" | "tradeCurrencyCode">,
): Promise<LockedContext> {
  const investments = new InvestmentsRepository(tx);
  const accounts = new AccountsRepository(tx);
  const instrument = await investments.lockInstrument(input.instrumentId);
  const investmentAccount = await investments.lockInvestmentAccount(
    input.investmentAccountId,
  );
  const [cash] = await accounts.lockByIds([investmentAccount.cashAccountId]);

  if (!cash || !cash.isActive) {
    applicationError("account_inactive");
  }
  if (cash.classification !== "asset") {
    applicationError("transaction_account_classification_mismatch");
  }
  if (cash.currencyCode !== normalizeCurrencyCode(input.tradeCurrencyCode)) {
    applicationError("investment_cash_currency_mismatch");
  }

  return { instrument, cash, investments, accounts };
}

async function tradeEquity(
  accounts: AccountsRepository,
  cash: AccountRecord,
  now: Date,
) {
  return accounts.getOrCreateSystemAccount({
    classification: "equity",
    currencyCode: cash.currencyCode,
    minorUnit: cash.minorUnit,
    now,
    subtype: "investment",
  });
}

async function persistJournal(
  deps: ApplicationDependencies,
  tx: DbTx,
  draft: JournalDraft,
  cashAccountId: string,
) {
  return persistTransactionBuild(
    deps,
    new LedgerRepository(tx),
    { draft, userAccountIds: [cashAccountId] },
  );
}

function commonSummary(input: {
  id: string;
  type: InvestmentTransactionSummary["type"];
  source: InvestmentOperationBase;
  occurredAt: Date;
  journalTransaction: TransactionSummary;
  quantity?: string;
  grossAmount?: string;
  feeAmount?: string;
  fx: string;
}): InvestmentTransactionSummary {
  return {
    id: input.id,
    type: input.type,
    investmentAccountId: input.source.investmentAccountId,
    instrumentId: input.source.instrumentId,
    occurredAt: input.occurredAt,
    ...(input.quantity ? { quantity: input.quantity } : {}),
    tradeCurrencyCode: normalizeCurrencyCode(input.source.tradeCurrencyCode),
    ...(input.grossAmount ? { grossAmount: input.grossAmount } : {}),
    ...(input.feeAmount ? { feeAmount: input.feeAmount } : {}),
    tradeFxRateToEur: input.fx,
    journalTransaction: input.journalTransaction,
  };
}

export async function buyInvestment(
  deps: ApplicationDependencies,
  input: BuyInvestmentInput,
): Promise<BuyInvestmentSummary> {
  return deps.unitOfWork.run(async (tx) => {
    const now = deps.clock.now();
    const occurredAt = input.occurredAt ?? now;
    const context = await lockContext(tx, input);

    if (await context.investments.hasLaterPostedDisposal({
      acquiredAt: occurredAt,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
    })) {
      applicationError("investment_backfill_after_disposal");
    }

    const quantity = normalizeQuantity(input.quantity, context.instrument.class);
    const grossAmount = normalizeMoney(input.grossAmount, context.cash);
    const feeAmount = normalizeNonNegativeMoney(
      input.feeAmount ?? "0",
      context.cash,
    );
    const fx = normalizeFxRateToEur(
      input.tradeFxRateToEur,
      context.cash.currencyCode,
    );
    const equity = await tradeEquity(context.accounts, context.cash, now);
    const cashOut = sumMoney(grossAmount, feeAmount, context.cash);
    const journalTransaction = await persistJournal(deps, tx, {
      type: "investment_trade",
      source: "web",
      occurredAt,
      description: input.description,
      postings: [
        posting(context.cash, negate(cashOut, context.cash)),
        posting(equity, cashOut),
      ],
    }, context.cash.id);
    const id = deps.ids.nextId("investmentTransaction");
    const lotId = deps.ids.nextId("taxLot");

    await context.investments.insertTransaction({
      id,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      journalTransactionId: journalTransaction.id,
      type: "buy",
      occurredAt,
      quantity,
      tradeCurrencyCode: context.cash.currencyCode,
      grossAmount,
      feeAmount,
      tradeFxRateToEur: fx,
    });
    await context.investments.insertLot({
      id: lotId,
      investmentTransactionId: id,
      instrumentId: input.instrumentId,
      acquiredAt: occurredAt,
      quantity,
      costCurrencyCode: context.cash.currencyCode,
      costAmount: grossAmount,
      feeAmount,
    });

    return {
      ...commonSummary({
        id,
        type: "buy",
        source: input,
        occurredAt,
        journalTransaction,
        quantity,
        grossAmount,
        feeAmount,
        fx,
      }),
      type: "buy",
      quantity,
      grossAmount,
      feeAmount,
      lotId,
    };
  });
}

export async function sellInvestment(
  deps: ApplicationDependencies,
  input: SellInvestmentInput,
): Promise<SellInvestmentSummary> {
  return deps.unitOfWork.run(async (tx) => {
    const now = deps.clock.now();
    const occurredAt = input.occurredAt ?? now;
    const context = await lockContext(tx, input);

    if (await context.investments.hasLaterPostedDisposal({
      acquiredAt: occurredAt,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
    })) {
      applicationError("investment_backdated_sale_after_disposal");
    }

    const openLots = await context.investments.lockOpenLots({
      disposedAt: occurredAt,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
    });

    if (openLots.some((lot) => lot.costCurrencyCode !== context.cash.currencyCode)) {
      applicationError("investment_trade_currency_mismatch");
    }

    const quantity = normalizeQuantity(input.quantity, context.instrument.class);
    const grossAmount = normalizeMoney(input.grossAmount, context.cash);
    const feeAmount = normalizeNonNegativeMoney(
      input.feeAmount ?? "0",
      context.cash,
    );
    const fx = normalizeFxRateToEur(
      input.tradeFxRateToEur,
      context.cash.currencyCode,
    );
    const fifo = disposeFifo(openLots, {
      assetClass: context.instrument.class,
      quantity,
      grossProceeds: grossAmount,
      saleFee: feeAmount,
    });
    const equity = await tradeEquity(context.accounts, context.cash, now);
    const cashIn = new ExactDecimal(grossAmount)
      .minus(feeAmount)
      .toFixed(context.cash.minorUnit);
    const journalTransaction = await persistJournal(deps, tx, {
      type: "investment_trade",
      source: "web",
      occurredAt,
      description: input.description,
      postings: [
        posting(context.cash, cashIn),
        posting(equity, negate(cashIn, equity)),
      ],
    }, context.cash.id);
    const id = deps.ids.nextId("investmentTransaction");

    await context.investments.insertTransaction({
      id,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      journalTransactionId: journalTransaction.id,
      type: "sell",
      occurredAt,
      quantity,
      tradeCurrencyCode: context.cash.currencyCode,
      grossAmount,
      feeAmount,
      tradeFxRateToEur: fx,
    });
    const remainingById = new Map(
      fifo.remainingLots.map((lot) => [lot.id, lot.remainingQuantity]),
    );
    const disposals = fifo.disposals.map((row) => ({
      id: deps.ids.nextId("lotDisposal"),
      ...row,
    }));
    await context.investments.applyDisposals({
      investmentTransactionId: id,
      disposedAt: occurredAt,
      proceedsCurrencyCode: context.cash.currencyCode,
      rows: disposals.map((row) => ({
        ...row,
        remainingQuantity: remainingById.get(row.lotId) ?? "0",
      })),
    });

    return {
      ...commonSummary({
        id,
        type: "sell",
        source: input,
        occurredAt,
        journalTransaction,
        quantity,
        grossAmount,
        feeAmount,
        fx,
      }),
      type: "sell",
      quantity,
      grossAmount,
      feeAmount,
      disposals,
      netProceeds: fifo.netProceeds,
      costBasis: fifo.costBasis,
      realizedReturn: fifo.realizedReturn,
    };
  });
}

async function recordCashFlow(
  deps: ApplicationDependencies,
  input: RecordDividendInput | RecordInvestmentFeeInput,
  type: "dividend" | "fee",
): Promise<InvestmentTransactionSummary> {
  return deps.unitOfWork.run(async (tx) => {
    const now = deps.clock.now();
    const occurredAt = input.occurredAt ?? now;
    const categories = new CategoriesRepository(tx);
    const isDividend = type === "dividend";
    const category = await categories.getOrCreateSystemCategory({
      id: isDividend ? "system-investment-income" : "system-investment-fees",
      name: isDividend ? "Investment income" : "Investment fees",
      classification: isDividend ? "income" : "expense",
      now,
    });
    const context = await lockContext(tx, input);
    const amount = normalizeMoney(
      isDividend
        ? (input as RecordDividendInput).grossAmount
        : (input as RecordInvestmentFeeInput).feeAmount,
      context.cash,
    );
    const fx = normalizeFxRateToEur(
      input.tradeFxRateToEur,
      context.cash.currencyCode,
    );
    const counterAccount = await context.accounts.getOrCreateSystemAccount({
      classification: isDividend ? "income" : "expense",
      currencyCode: context.cash.currencyCode,
      minorUnit: context.cash.minorUnit,
      now,
      subtype: isDividend ? "income" : "fees",
    });
    const draft: JournalDraft = {
      type: isDividend ? "income" : "fee",
      source: "web",
      occurredAt,
      description: input.description,
      postings: isDividend
        ? [
            posting(context.cash, amount),
            posting(counterAccount, negate(amount, counterAccount), category.id),
          ]
        : [
            posting(counterAccount, amount, category.id),
            posting(context.cash, negate(amount, context.cash)),
          ],
    };
    const journalTransaction = await persistJournal(
      deps,
      tx,
      draft,
      context.cash.id,
    );
    const id = deps.ids.nextId("investmentTransaction");
    const grossAmount = isDividend ? amount : undefined;
    const feeAmount = isDividend ? undefined : amount;

    await context.investments.insertTransaction({
      id,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      journalTransactionId: journalTransaction.id,
      type,
      occurredAt,
      tradeCurrencyCode: context.cash.currencyCode,
      ...(grossAmount ? { grossAmount } : {}),
      ...(feeAmount ? { feeAmount } : {}),
      tradeFxRateToEur: fx,
    });

    if (!isDividend) {
      await recomputeBudgetSeriesForDrafts(deps, tx, [draft]);
    }

    return commonSummary({
      id,
      type,
      source: input,
      occurredAt,
      journalTransaction,
      grossAmount,
      feeAmount,
      fx,
    });
  });
}

export function recordDividend(
  deps: ApplicationDependencies,
  input: RecordDividendInput,
) {
  return recordCashFlow(deps, input, "dividend");
}

export function recordInvestmentFee(
  deps: ApplicationDependencies,
  input: RecordInvestmentFeeInput,
) {
  return recordCashFlow(deps, input, "fee");
}

export async function getPositionPerformanceInTransaction(
  tx: DbTx,
  input: GetPositionPerformanceInput,
  options: { lock: boolean },
) {
    const investments = new InvestmentsRepository(tx);
    const instrument = options.lock
      ? await investments.lockInstrument(input.instrumentId)
      : await investments.getInstrument(input.instrumentId);
    if (options.lock) {
      await investments.lockInvestmentAccount(input.investmentAccountId);
    } else {
      await investments.getInvestmentAccount(input.investmentAccountId);
    }
    const quoteCurrency = normalizeCurrencyCode(input.valuation.quote.currencyCode);
    const fxBase = normalizeCurrencyCode(input.valuation.reportingFx.baseCurrencyCode);
    const reportingCurrency = normalizeCurrencyCode(
      input.valuation.reportingFx.quoteCurrencyCode,
    );

    if (quoteCurrency !== instrument.quoteCurrencyCode || fxBase !== quoteCurrency) {
      applicationError("investment_trade_currency_mismatch");
    }
    if (reportingCurrency !== "EUR") {
      applicationError("investment_reporting_currency_unsupported");
    }

    const price = new ExactDecimal(Rate.parse(input.valuation.quote.price).value);
    const currentFx = new ExactDecimal(normalizeFxRateToEur(
      input.valuation.reportingFx.rate,
      quoteCurrency,
    ));
    const lots = options.lock
      ? await investments.getOpenLots(input)
      : await investments.getOpenLotsSnapshot(input);
    const realizedRows = await investments.getRealizedDisposals(input);
    const quantity = lots.reduce(
      (sum, lot) => sum.plus(lot.remainingQuantity),
      new ExactDecimal(0),
    );
    const openBasisByLot = lots.map((lot) => {
      const totalBasis = new ExactDecimal(lot.costAmount).plus(lot.feeAmount);
      const remainingBasis = totalBasis.minus(lot.disposedCostBasisAmount ?? "0");
      return { lot, remainingBasis };
    });
    const openBasisEur = openBasisByLot.reduce(
      (sum, row) => sum.plus(
        row.remainingBasis.times(row.lot.tradeFxRateToEur),
      ),
      new ExactDecimal(0),
    );
    const openCostCurrencies = new Set(
      openBasisByLot.map((row) => row.lot.costCurrencyCode),
    );
    const openCostCurrency = openCostCurrencies.size === 1
      ? [...openCostCurrencies][0] ?? "EUR"
      : "EUR";
    const openBasisOriginal = openCostCurrency === "EUR" &&
      openCostCurrencies.size !== 1
      ? openBasisEur
      : openBasisByLot.reduce(
          (sum, row) => sum.plus(row.remainingBasis),
          new ExactDecimal(0),
        );
    const realizedEur = realizedRows.reduce((sum, row) => {
      return sum
        .plus(new ExactDecimal(row.proceedsAmount).times(row.saleFxRateToEur))
        .minus(
          new ExactDecimal(row.costBasisAmount).times(row.acquisitionFxRateToEur),
        );
    }, new ExactDecimal(0));
    const marketValue = quantity.times(price);
    const marketValueEur = marketValue.times(currentFx);
    const openBasisInQuote = openBasisEur.div(currentFx);
    const unrealizedQuote = marketValue.minus(openBasisInQuote);
    const unrealizedEur = marketValueEur.minus(openBasisEur);
    const realizedCurrencies = new Set(
      realizedRows.flatMap((row) => [row.proceedsCurrencyCode, row.costCurrencyCode]),
    );
    const realizedCurrency = realizedCurrencies.size === 1
      ? [...realizedCurrencies][0] ?? "EUR"
      : "EUR";
    const realizedOriginal = realizedCurrencies.size === 1
      ? realizedRows.reduce(
          (sum, row) => sum
            .plus(row.proceedsAmount)
            .minus(row.costBasisAmount),
          new ExactDecimal(0),
        )
      : realizedEur;

    return {
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      quantity: canonical(quantity),
      openCostBasis: {
        amount: canonical(openBasisOriginal),
        currencyCode: openCostCurrency,
        reportingAmount: canonical(openBasisEur),
        reportingCurrencyCode: "EUR",
      },
      marketValue: {
        amount: canonical(marketValue),
        currencyCode: quoteCurrency,
        reportingAmount: canonical(marketValueEur),
        reportingCurrencyCode: "EUR",
      },
      realizedReturn: {
        amount: canonical(realizedOriginal),
        currencyCode: realizedCurrency,
        reportingAmount: canonical(realizedEur),
        reportingCurrencyCode: "EUR",
      },
      unrealizedReturn: {
        amount: canonical(unrealizedQuote),
        currencyCode: quoteCurrency,
        reportingAmount: canonical(unrealizedEur),
        reportingCurrencyCode: "EUR",
      },
      valuation: input.valuation,
    };
}

export async function getPositionPerformance(
  deps: ApplicationDependencies,
  input: GetPositionPerformanceInput,
) {
  return deps.unitOfWork.run((tx) =>
    getPositionPerformanceInTransaction(tx, input, { lock: true }));
}
