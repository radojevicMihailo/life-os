import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Clock } from "./ports";
import type { UnitOfWork } from "../db/unit-of-work";
import type { DbTx } from "../db/client";
import {
  accounts,
  budgetLimits,
  budgetPeriods,
  categories,
  currencies,
  exchangeRates,
  goals,
  instruments,
  investmentAccounts,
  investmentTransactions,
  journalPostings,
  journalTransactions,
  lotDisposals,
  manualValuationOverrides,
  marketQuotes,
  taxLots,
} from "../db/schema";

type IsoTimestamp = string;

export interface FullExportV1 {
  meta: {
    exportedAt: IsoTimestamp;
    reportingCurrencyCode: "EUR";
    schemaVersion: 1;
  };
  currencies: Array<Record<string, unknown>>;
  accounts: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  journalTransactions: Array<Record<string, unknown>>;
  journalPostings: Array<Record<string, unknown>>;
  budgetLimits: Array<Record<string, unknown>>;
  budgetPeriods: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  instruments: Array<Record<string, unknown>>;
  investmentAccounts: Array<Record<string, unknown>>;
  investmentTransactions: Array<Record<string, unknown>>;
  taxLots: Array<Record<string, unknown>>;
  lotDisposals: Array<Record<string, unknown>>;
  exchangeRates: Array<Record<string, unknown>>;
  marketQuotes: Array<Record<string, unknown>>;
  manualValuationOverrides: Array<Record<string, unknown>>;
}

export interface ExportDependencies {
  clock: Clock;
  unitOfWork: UnitOfWork;
}

export type ExportCsvDataset =
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "positions"
  | "lots"
  | "investment-activity";

type CsvCell = { kind: "decimal"; value: string } | string | null;

export interface ExportCsvDocument {
  headers: readonly string[];
  rows: AsyncIterable<readonly CsvCell[]>;
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export async function buildFullExport(
  dependencies: ExportDependencies,
): Promise<FullExportV1> {
  return dependencies.unitOfWork.run(async (tx) => {
    const currencyRows = await tx.select({ code: currencies.code, name: currencies.name, minorUnit: currencies.minorUnit, isActive: currencies.isActive, activatedAt: currencies.activatedAt, createdAt: currencies.createdAt }).from(currencies).orderBy(asc(currencies.code));
    const accountRows = await tx.select({ id: accounts.id, name: accounts.name, classification: accounts.classification, subtype: accounts.subtype, currencyCode: accounts.currencyCode, isSystem: accounts.isSystem, isActive: accounts.isActive, archivedAt: accounts.archivedAt, createdAt: accounts.createdAt, updatedAt: accounts.updatedAt }).from(accounts).orderBy(asc(accounts.id));
    const categoryRows = await tx.select({ id: categories.id, name: categories.name, classification: categories.classification, isSystem: categories.isSystem, isActive: categories.isActive, archivedAt: categories.archivedAt, createdAt: categories.createdAt, updatedAt: categories.updatedAt }).from(categories).orderBy(asc(categories.id));
    const journalTransactionRows = await tx.select({ id: journalTransactions.id, type: journalTransactions.type, occurredAt: journalTransactions.occurredAt, description: journalTransactions.description, source: journalTransactions.source, status: journalTransactions.status, correctionOfId: journalTransactions.correctionOfId, correctedById: journalTransactions.correctedById, externalReference: journalTransactions.externalReference, createdAt: journalTransactions.createdAt }).from(journalTransactions).orderBy(asc(journalTransactions.id));
    const journalPostingRows = await tx.select({ id: journalPostings.id, transactionId: journalPostings.transactionId, accountId: journalPostings.accountId, currencyCode: journalPostings.currencyCode, amount: journalPostings.amount, categoryId: journalPostings.categoryId, counterparty: journalPostings.counterparty, createdAt: journalPostings.createdAt }).from(journalPostings).orderBy(asc(journalPostings.id));
    const budgetLimitRows = await tx.select({ id: budgetLimits.id, categoryId: budgetLimits.categoryId, month: budgetLimits.month, currencyCode: budgetLimits.currencyCode, amount: budgetLimits.amount, createdAt: budgetLimits.createdAt, updatedAt: budgetLimits.updatedAt }).from(budgetLimits).orderBy(asc(budgetLimits.id));
    const budgetPeriodRows = await tx.select({ id: budgetPeriods.id, categoryId: budgetPeriods.categoryId, month: budgetPeriods.month, currencyCode: budgetPeriods.currencyCode, limitAmount: budgetPeriods.limitAmount, carryInAmount: budgetPeriods.carryInAmount, spendingAmount: budgetPeriods.spendingAmount, remainingAmount: budgetPeriods.remainingAmount, recomputedAt: budgetPeriods.recomputedAt }).from(budgetPeriods).orderBy(asc(budgetPeriods.id));
    const goalRows = await tx.select({ id: goals.id, name: goals.name, accountId: goals.accountId, targetCurrencyCode: goals.targetCurrencyCode, targetAmount: goals.targetAmount, isActive: goals.isActive, archivedAt: goals.archivedAt, createdAt: goals.createdAt, updatedAt: goals.updatedAt }).from(goals).orderBy(asc(goals.id));
    const instrumentRows = await tx.select({ id: instruments.id, symbol: instruments.symbol, name: instruments.name, class: instruments.class, valuationMethod: instruments.valuationMethod, quoteCurrencyCode: instruments.quoteCurrencyCode, provider: instruments.provider, providerId: instruments.providerId, isin: instruments.isin, exchange: instruments.exchange, isActive: instruments.isActive, archivedAt: instruments.archivedAt, createdAt: instruments.createdAt, updatedAt: instruments.updatedAt }).from(instruments).orderBy(asc(instruments.id));
    const investmentAccountRows = await tx.select({ id: investmentAccounts.id, name: investmentAccounts.name, cashAccountId: investmentAccounts.cashAccountId, provider: investmentAccounts.provider, isActive: investmentAccounts.isActive, archivedAt: investmentAccounts.archivedAt, createdAt: investmentAccounts.createdAt }).from(investmentAccounts).orderBy(asc(investmentAccounts.id));
    const investmentTransactionRows = await tx.select({ id: investmentTransactions.id, investmentAccountId: investmentTransactions.investmentAccountId, instrumentId: investmentTransactions.instrumentId, journalTransactionId: investmentTransactions.journalTransactionId, type: investmentTransactions.type, status: investmentTransactions.status, occurredAt: investmentTransactions.occurredAt, quantity: investmentTransactions.quantity, tradeCurrencyCode: investmentTransactions.tradeCurrencyCode, grossAmount: investmentTransactions.grossAmount, feeAmount: investmentTransactions.feeAmount, tradeFxRateToEur: investmentTransactions.tradeFxRateToEur, correctionOfId: investmentTransactions.correctionOfId, correctedById: investmentTransactions.correctedById, createdAt: investmentTransactions.createdAt }).from(investmentTransactions).orderBy(asc(investmentTransactions.id));
    const taxLotRows = await tx.select({ id: taxLots.id, investmentTransactionId: taxLots.investmentTransactionId, instrumentId: taxLots.instrumentId, acquiredAt: taxLots.acquiredAt, quantity: taxLots.quantity, remainingQuantity: taxLots.remainingQuantity, costCurrencyCode: taxLots.costCurrencyCode, costAmount: taxLots.costAmount, feeAmount: taxLots.feeAmount, createdAt: taxLots.createdAt }).from(taxLots).orderBy(asc(taxLots.id));
    const lotDisposalRows = await tx.select({ id: lotDisposals.id, taxLotId: lotDisposals.taxLotId, investmentTransactionId: lotDisposals.investmentTransactionId, disposedAt: lotDisposals.disposedAt, quantity: lotDisposals.quantity, proceedsCurrencyCode: lotDisposals.proceedsCurrencyCode, proceedsAmount: lotDisposals.proceedsAmount, costBasisAmount: lotDisposals.costBasisAmount, createdAt: lotDisposals.createdAt }).from(lotDisposals).orderBy(asc(lotDisposals.id));
    const exchangeRateRows = await tx.select({ id: exchangeRates.id, baseCurrencyCode: exchangeRates.baseCurrencyCode, quoteCurrencyCode: exchangeRates.quoteCurrencyCode, rate: exchangeRates.rate, provider: exchangeRates.provider, providerTimestamp: exchangeRates.providerTimestamp, retrievedAt: exchangeRates.retrievedAt, status: exchangeRates.status }).from(exchangeRates).orderBy(asc(exchangeRates.id));
    const marketQuoteRows = await tx.select({ id: marketQuotes.id, instrumentId: marketQuotes.instrumentId, quoteCurrencyCode: marketQuotes.quoteCurrencyCode, price: marketQuotes.price, provider: marketQuotes.provider, providerTimestamp: marketQuotes.providerTimestamp, retrievedAt: marketQuotes.retrievedAt, status: marketQuotes.status }).from(marketQuotes).orderBy(asc(marketQuotes.id));
    const manualOverrideRows = await tx.select({ id: manualValuationOverrides.id, kind: manualValuationOverrides.kind, baseCurrencyCode: manualValuationOverrides.baseCurrencyCode, quoteCurrencyCode: manualValuationOverrides.quoteCurrencyCode, instrumentId: manualValuationOverrides.instrumentId, value: manualValuationOverrides.value, effectiveAt: manualValuationOverrides.effectiveAt, clearedAt: manualValuationOverrides.clearedAt, createdAt: manualValuationOverrides.createdAt }).from(manualValuationOverrides).orderBy(asc(manualValuationOverrides.id));

    return {
      meta: {
        exportedAt: dependencies.clock.now().toISOString(),
        reportingCurrencyCode: "EUR",
        schemaVersion: 1,
      },
      currencies: currencyRows.map((row) => ({ ...row, activatedAt: iso(row.activatedAt), createdAt: row.createdAt.toISOString() })),
      accounts: accountRows.map((row) => ({ ...row, archivedAt: iso(row.archivedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
      categories: categoryRows.map((row) => ({ ...row, archivedAt: iso(row.archivedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
      journalTransactions: journalTransactionRows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString(), createdAt: row.createdAt.toISOString() })),
      journalPostings: journalPostingRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      budgetLimits: budgetLimitRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
      budgetPeriods: budgetPeriodRows.map((row) => ({ ...row, recomputedAt: row.recomputedAt.toISOString() })),
      goals: goalRows.map((row) => ({ ...row, archivedAt: iso(row.archivedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
      instruments: instrumentRows.map((row) => ({ ...row, archivedAt: iso(row.archivedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
      investmentAccounts: investmentAccountRows.map((row) => ({ ...row, archivedAt: iso(row.archivedAt), createdAt: row.createdAt.toISOString() })),
      investmentTransactions: investmentTransactionRows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString(), createdAt: row.createdAt.toISOString() })),
      taxLots: taxLotRows.map((row) => ({ ...row, acquiredAt: row.acquiredAt.toISOString(), createdAt: row.createdAt.toISOString() })),
      lotDisposals: lotDisposalRows.map((row) => ({ ...row, disposedAt: row.disposedAt.toISOString(), createdAt: row.createdAt.toISOString() })),
      exchangeRates: exchangeRateRows.map((row) => ({ ...row, providerTimestamp: row.providerTimestamp.toISOString(), retrievedAt: row.retrievedAt.toISOString() })),
      marketQuotes: marketQuoteRows.map((row) => ({ ...row, providerTimestamp: row.providerTimestamp.toISOString(), retrievedAt: row.retrievedAt.toISOString() })),
      manualValuationOverrides: manualOverrideRows.map((row) => ({ ...row, effectiveAt: row.effectiveAt.toISOString(), clearedAt: iso(row.clearedAt), createdAt: row.createdAt.toISOString() })),
    };
  }, { accessMode: "read only", isolationLevel: "repeatable read" });
}

function textCell(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function decimalCell(value: unknown): CsvCell {
  return typeof value === "string" ? { kind: "decimal", value } : null;
}

type CsvRow = readonly CsvCell[];
type CsvPage = (tx: DbTx, offset: number) => Promise<CsvRow[]>;

const CSV_PAGE_SIZE = 250;

class BoundedCsvRows implements AsyncIterable<CsvRow>, AsyncIterator<CsvRow> {
  private buffered: CsvRow | undefined;
  private cancelled = false;
  private closed = false;
  private failure: unknown;
  private nextWaiter: {
    reject(error: unknown): void;
    resolve(result: IteratorResult<CsvRow>): void;
  } | undefined;
  private spaceWaiter: (() => void) | undefined;

  [Symbol.asyncIterator]() { return this; }

  async return(): Promise<IteratorResult<CsvRow>> {
    this.cancelled = true;
    this.close();
    return { done: true, value: undefined };
  }

  async next(): Promise<IteratorResult<CsvRow>> {
    if (this.failure) throw this.failure;
    if (this.buffered) {
      const value = this.buffered;
      this.buffered = undefined;
      this.spaceWaiter?.();
      this.spaceWaiter = undefined;
      return { done: false, value };
    }
    if (this.closed) return { done: true, value: undefined };
    return new Promise<IteratorResult<CsvRow>>((resolve, reject) => {
      this.nextWaiter = { resolve, reject };
    });
  }

  async push(row: CsvRow): Promise<boolean> {
    if (this.cancelled) return false;
    if (this.failure) throw this.failure;
    if (this.closed) return false;
    if (this.nextWaiter) {
      this.nextWaiter.resolve({ done: false, value: row });
      this.nextWaiter = undefined;
      return !this.cancelled;
    }
    this.buffered = row;
    await new Promise<void>((resolve) => { this.spaceWaiter = resolve; });
    return !this.cancelled;
  }

  close() {
    this.closed = true;
    this.nextWaiter?.resolve({ done: true, value: undefined });
    this.nextWaiter = undefined;
    this.spaceWaiter?.();
    this.spaceWaiter = undefined;
  }

  fail(error: unknown) {
    this.failure = error;
    this.nextWaiter?.reject(error);
    this.nextWaiter = undefined;
    this.spaceWaiter?.();
    this.spaceWaiter = undefined;
  }
}

function csvDefinition(dataset: ExportCsvDataset): { headers: string[]; page: CsvPage } {
  switch (dataset) {
    case "transactions":
      return {
        headers: ["ID transakcije", "Datum", "Tip", "Status", "Opis", "Izvor", "ID stavke", "ID računa", "Valuta", "Iznos", "ID kategorije", "Druga strana"],
        page: async (tx, offset) => (await tx.select({ transactionId: journalTransactions.id, occurredAt: journalTransactions.occurredAt, type: journalTransactions.type, status: journalTransactions.status, description: journalTransactions.description, source: journalTransactions.source, postingId: journalPostings.id, accountId: journalPostings.accountId, currencyCode: journalPostings.currencyCode, amount: journalPostings.amount, categoryId: journalPostings.categoryId, counterparty: journalPostings.counterparty }).from(journalPostings).innerJoin(journalTransactions, eq(journalTransactions.id, journalPostings.transactionId)).orderBy(asc(journalTransactions.id), asc(journalPostings.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.transactionId), textCell(row.occurredAt.toISOString()), textCell(row.type), textCell(row.status), textCell(row.description), textCell(row.source), textCell(row.postingId), textCell(row.accountId), textCell(row.currencyCode), decimalCell(row.amount), textCell(row.categoryId), textCell(row.counterparty)]),
      };
    case "accounts":
      return {
        headers: ["ID računa", "Naziv", "Klasifikacija", "Podtip", "Valuta", "Sistemski", "Aktivan", "Arhiviran", "Kreiran", "Ažuriran"],
        page: async (tx, offset) => (await tx.select({ id: accounts.id, name: accounts.name, classification: accounts.classification, subtype: accounts.subtype, currencyCode: accounts.currencyCode, isSystem: accounts.isSystem, isActive: accounts.isActive, archivedAt: accounts.archivedAt, createdAt: accounts.createdAt, updatedAt: accounts.updatedAt }).from(accounts).orderBy(asc(accounts.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.id), textCell(row.name), textCell(row.classification), textCell(row.subtype), textCell(row.currencyCode), textCell(row.isSystem), textCell(row.isActive), textCell(iso(row.archivedAt)), textCell(row.createdAt.toISOString()), textCell(row.updatedAt.toISOString())]),
      };
    case "budgets":
      return {
        headers: ["ID limita", "ID perioda", "ID kategorije", "Mesec", "Valuta", "Limit", "Prenos", "Potrošnja", "Preostalo", "Preračunato"],
        page: async (tx, offset) => (await tx.select({ limitId: budgetLimits.id, periodId: budgetPeriods.id, categoryId: budgetLimits.categoryId, month: budgetLimits.month, currencyCode: budgetLimits.currencyCode, amount: budgetLimits.amount, carryInAmount: budgetPeriods.carryInAmount, spendingAmount: budgetPeriods.spendingAmount, remainingAmount: budgetPeriods.remainingAmount, recomputedAt: budgetPeriods.recomputedAt }).from(budgetLimits).leftJoin(budgetPeriods, and(eq(budgetPeriods.categoryId, budgetLimits.categoryId), eq(budgetPeriods.month, budgetLimits.month))).orderBy(asc(budgetLimits.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.limitId), textCell(row.periodId), textCell(row.categoryId), textCell(row.month), textCell(row.currencyCode), decimalCell(row.amount), decimalCell(row.carryInAmount), decimalCell(row.spendingAmount), decimalCell(row.remainingAmount), textCell(row.recomputedAt?.toISOString())]),
      };
    case "goals":
      return {
        headers: ["ID cilja", "Naziv", "ID računa", "Valuta cilja", "Ciljni iznos", "Aktivan", "Arhiviran", "Kreiran", "Ažuriran"],
        page: async (tx, offset) => (await tx.select({ id: goals.id, name: goals.name, accountId: goals.accountId, targetCurrencyCode: goals.targetCurrencyCode, targetAmount: goals.targetAmount, isActive: goals.isActive, archivedAt: goals.archivedAt, createdAt: goals.createdAt, updatedAt: goals.updatedAt }).from(goals).orderBy(asc(goals.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.id), textCell(row.name), textCell(row.accountId), textCell(row.targetCurrencyCode), decimalCell(row.targetAmount), textCell(row.isActive), textCell(iso(row.archivedAt)), textCell(row.createdAt.toISOString()), textCell(row.updatedAt.toISOString())]),
      };
    case "positions": {
      const quantity = sql<string>`sum(case when ${investmentTransactions.type} = 'buy' then ${investmentTransactions.quantity} else -${investmentTransactions.quantity} end)`;
      return {
        headers: ["ID investicionog računa", "ID instrumenta", "Količina", "Valuta kotacije"],
        page: async (tx, offset) => (await tx.select({ investmentAccountId: investmentTransactions.investmentAccountId, instrumentId: investmentTransactions.instrumentId, quantity, quoteCurrencyCode: instruments.quoteCurrencyCode }).from(investmentTransactions).innerJoin(instruments, eq(instruments.id, investmentTransactions.instrumentId)).where(and(eq(investmentTransactions.status, "posted"), inArray(investmentTransactions.type, ["buy", "sell"]))).groupBy(investmentTransactions.investmentAccountId, investmentTransactions.instrumentId, instruments.quoteCurrencyCode).having(sql`${quantity} <> 0`).orderBy(asc(investmentTransactions.investmentAccountId), asc(investmentTransactions.instrumentId)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.investmentAccountId), textCell(row.instrumentId), decimalCell(row.quantity), textCell(row.quoteCurrencyCode)]),
      };
    }
    case "lots":
      return {
        headers: ["ID lota", "ID investicione transakcije", "ID instrumenta", "Datum sticanja", "Količina", "Preostala količina", "Valuta troška", "Trošak", "Naknada", "ID raspolaganja", "ID prodajne transakcije", "Datum raspolaganja", "Prodata količina", "Valuta prihoda", "Prihod", "Troškovna osnova", "Kreiran"],
        page: async (tx, offset) => (await tx.select({ id: taxLots.id, investmentTransactionId: taxLots.investmentTransactionId, instrumentId: taxLots.instrumentId, acquiredAt: taxLots.acquiredAt, quantity: taxLots.quantity, remainingQuantity: taxLots.remainingQuantity, costCurrencyCode: taxLots.costCurrencyCode, costAmount: taxLots.costAmount, feeAmount: taxLots.feeAmount, disposalId: lotDisposals.id, disposalInvestmentTransactionId: lotDisposals.investmentTransactionId, disposedAt: lotDisposals.disposedAt, disposalQuantity: lotDisposals.quantity, proceedsCurrencyCode: lotDisposals.proceedsCurrencyCode, proceedsAmount: lotDisposals.proceedsAmount, costBasisAmount: lotDisposals.costBasisAmount, createdAt: taxLots.createdAt }).from(taxLots).leftJoin(lotDisposals, eq(lotDisposals.taxLotId, taxLots.id)).orderBy(asc(taxLots.id), asc(lotDisposals.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.id), textCell(row.investmentTransactionId), textCell(row.instrumentId), textCell(row.acquiredAt.toISOString()), decimalCell(row.quantity), decimalCell(row.remainingQuantity), textCell(row.costCurrencyCode), decimalCell(row.costAmount), decimalCell(row.feeAmount), textCell(row.disposalId), textCell(row.disposalInvestmentTransactionId), textCell(row.disposedAt?.toISOString()), decimalCell(row.disposalQuantity), textCell(row.proceedsCurrencyCode), decimalCell(row.proceedsAmount), decimalCell(row.costBasisAmount), textCell(row.createdAt.toISOString())]),
      };
    case "investment-activity":
      return {
        headers: ["ID investicione transakcije", "ID investicionog računa", "ID instrumenta", "ID journal transakcije", "Tip", "Status", "Datum", "Količina", "Valuta trgovine", "Bruto iznos", "Naknada", "Kurs prema EUR", "Korekcija od", "Koregovano sa", "Kreiran"],
        page: async (tx, offset) => (await tx.select({ id: investmentTransactions.id, investmentAccountId: investmentTransactions.investmentAccountId, instrumentId: investmentTransactions.instrumentId, journalTransactionId: investmentTransactions.journalTransactionId, type: investmentTransactions.type, status: investmentTransactions.status, occurredAt: investmentTransactions.occurredAt, quantity: investmentTransactions.quantity, tradeCurrencyCode: investmentTransactions.tradeCurrencyCode, grossAmount: investmentTransactions.grossAmount, feeAmount: investmentTransactions.feeAmount, tradeFxRateToEur: investmentTransactions.tradeFxRateToEur, correctionOfId: investmentTransactions.correctionOfId, correctedById: investmentTransactions.correctedById, createdAt: investmentTransactions.createdAt }).from(investmentTransactions).orderBy(asc(investmentTransactions.id)).limit(CSV_PAGE_SIZE).offset(offset)).map((row) => [textCell(row.id), textCell(row.investmentAccountId), textCell(row.instrumentId), textCell(row.journalTransactionId), textCell(row.type), textCell(row.status), textCell(row.occurredAt.toISOString()), decimalCell(row.quantity), textCell(row.tradeCurrencyCode), decimalCell(row.grossAmount), decimalCell(row.feeAmount), decimalCell(row.tradeFxRateToEur), textCell(row.correctionOfId), textCell(row.correctedById), textCell(row.createdAt.toISOString())]),
      };
  }
}

async function streamingRows(
  dependencies: ExportDependencies,
  page: CsvPage,
): Promise<AsyncIterable<CsvRow>> {
  const rows = new BoundedCsvRows();
  let initialized = false;
  let rejectInitialization: (error: unknown) => void;
  let resolveInitialization: () => void;
  const initializedPromise = new Promise<void>((resolve, reject) => {
    resolveInitialization = resolve;
    rejectInitialization = reject;
  });

  void dependencies.unitOfWork.run(async (tx) => {
    try {
      let offset = 0;
      let pageRows = await page(tx, offset);
      initialized = true;
      resolveInitialization();
      while (pageRows.length > 0) {
        for (const row of pageRows) {
          if (!await rows.push(row)) return;
        }
        offset += pageRows.length;
        pageRows = await page(tx, offset);
      }
      rows.close();
    } catch (error) {
      if (!initialized) rejectInitialization(error);
      else rows.fail(error);
    }
  }, { accessMode: "read only", isolationLevel: "repeatable read" }).catch((error) => {
    if (!initialized) rejectInitialization(error);
    else rows.fail(error);
  });

  await initializedPromise;
  return rows;
}

export async function buildCsvDocument(
  dependencies: ExportDependencies,
  dataset: ExportCsvDataset,
): Promise<ExportCsvDocument> {
  const definition = csvDefinition(dataset);
  return { headers: definition.headers, rows: await streamingRows(dependencies, definition.page) };
}
