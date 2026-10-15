import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, gt, inArray, lte, sql } from "drizzle-orm";

import { applicationError } from "../../application/ports";
import type { ActiveInvestmentClass, InvestmentLot } from "../../domain/investments";
import type { DbTx } from "../client";
import {
  investmentAccounts,
  investmentTransactions,
  instruments,
  lotDisposals,
  taxLots,
} from "../schema";

export interface InstrumentRecord {
  id: string;
  symbol?: string;
  name?: string;
  class: ActiveInvestmentClass;
  isActive: boolean;
  quoteCurrencyCode: string;
  provider?: string | null;
  providerId?: string | null;
}

export interface InvestmentAccountRecord {
  id: string;
  cashAccountId: string;
  isActive: boolean;
}

export interface OpenLotRecord extends InvestmentLot {
  instrumentId: string;
  investmentTransactionId: string;
  costCurrencyCode: string;
  tradeFxRateToEur: string;
}

export interface InvestmentTransactionInsert {
  id: string;
  investmentAccountId: string;
  instrumentId: string;
  journalTransactionId?: string | null;
  type: "buy" | "sell" | "dividend" | "fee";
  occurredAt: Date;
  quantity?: string;
  tradeCurrencyCode: string;
  grossAmount?: string;
  feeAmount?: string;
  tradeFxRateToEur: string;
  correctionOfId?: string;
}

export type PerformanceLotRecord = OpenLotRecord;

export interface RealizedDisposalRecord {
  proceedsAmount: string;
  costBasisAmount: string;
  proceedsCurrencyCode: string;
  saleFxRateToEur: string;
  costCurrencyCode: string;
  acquisitionFxRateToEur: string;
}

function canonicalDatabaseDecimal(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export class InvestmentsRepository {
  constructor(private readonly tx: DbTx) {}

  private validateInstrument(
    instrument: InstrumentRecord | undefined,
  ): InstrumentRecord {
    if (!instrument) {
      applicationError("instrument_not_found");
    }
    if (!instrument.isActive) {
      applicationError("instrument_inactive");
    }
    if (!(["stock", "etf", "crypto"] as const).includes(
      instrument.class as ActiveInvestmentClass,
    )) {
      applicationError("investment_asset_class_unsupported");
    }

    return instrument;
  }

  async getInstrument(id: string): Promise<InstrumentRecord> {
    const [instrument] = await this.tx
      .select({
        id: instruments.id,
        class: instruments.class,
        isActive: instruments.isActive,
        quoteCurrencyCode: instruments.quoteCurrencyCode,
      })
      .from(instruments)
      .where(eq(instruments.id, id));

    return this.validateInstrument(instrument as InstrumentRecord | undefined);
  }

  async createInstrument(input: {
    id: string;
    symbol: string;
    name: string;
    class: ActiveInvestmentClass;
    quoteCurrencyCode: string;
    provider: string;
    providerId: string;
    isin?: string;
    exchange?: string;
    now: Date;
  }) {
    const [instrument] = await this.tx.insert(instruments).values({
      id: input.id,
      symbol: input.symbol,
      name: input.name,
      class: input.class,
      valuationMethod: "market_quote",
      quoteCurrencyCode: input.quoteCurrencyCode,
      provider: input.provider,
      providerId: input.providerId,
      isin: input.isin ?? null,
      exchange: input.exchange ?? null,
      isActive: true,
      archivedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    }).returning();
    if (!instrument) applicationError("instrument_not_found");
    return instrument;
  }

  async lockInstrument(id: string): Promise<InstrumentRecord> {
    const [instrument] = await this.tx
      .select({
        id: instruments.id,
        class: instruments.class,
        isActive: instruments.isActive,
        quoteCurrencyCode: instruments.quoteCurrencyCode,
      })
      .from(instruments)
      .where(eq(instruments.id, id))
      .for("update");

    return this.validateInstrument(instrument as InstrumentRecord | undefined);
  }

  private validateInvestmentAccount(
    account: InvestmentAccountRecord | undefined,
  ): InvestmentAccountRecord {
    if (!account) {
      applicationError("investment_account_not_found");
    }
    if (!account.isActive) {
      applicationError("investment_account_inactive");
    }

    return account;
  }

  async getInvestmentAccount(id: string): Promise<InvestmentAccountRecord> {
    const [account] = await this.tx
      .select({
        id: investmentAccounts.id,
        cashAccountId: investmentAccounts.cashAccountId,
        isActive: investmentAccounts.isActive,
      })
      .from(investmentAccounts)
      .where(eq(investmentAccounts.id, id));

    return this.validateInvestmentAccount(account);
  }

  async lockInvestmentAccount(id: string): Promise<InvestmentAccountRecord> {
    const [account] = await this.tx
      .select({
        id: investmentAccounts.id,
        cashAccountId: investmentAccounts.cashAccountId,
        isActive: investmentAccounts.isActive,
      })
      .from(investmentAccounts)
      .where(eq(investmentAccounts.id, id))
      .for("update");

    return this.validateInvestmentAccount(account);
  }

  async createInvestmentAccount(input: {
    id: string;
    name: string;
    cashAccountId: string;
    provider?: string;
    now: Date;
  }) {
    const [account] = await this.tx.insert(investmentAccounts).values({
      id: input.id,
      name: input.name,
      cashAccountId: input.cashAccountId,
      provider: input.provider ?? null,
      isActive: true,
      archivedAt: null,
      createdAt: input.now,
    }).returning();
    if (!account) applicationError("investment_account_not_found");
    return account;
  }

  private async readOpenLots(input: {
    disposedAt?: Date;
    investmentAccountId: string;
    instrumentId: string;
  }, lock: boolean): Promise<OpenLotRecord[]> {
    const query = this.tx
      .select({
        id: taxLots.id,
        acquiredAt: taxLots.acquiredAt,
        quantity: taxLots.quantity,
        remainingQuantity: taxLots.remainingQuantity,
        costAmount: taxLots.costAmount,
        feeAmount: taxLots.feeAmount,
        costCurrencyCode: taxLots.costCurrencyCode,
        instrumentId: taxLots.instrumentId,
        investmentTransactionId: taxLots.investmentTransactionId,
        tradeFxRateToEur: investmentTransactions.tradeFxRateToEur,
      })
      .from(taxLots)
      .innerJoin(
        investmentTransactions,
        eq(investmentTransactions.id, taxLots.investmentTransactionId),
      )
      .where(and(
        eq(investmentTransactions.investmentAccountId, input.investmentAccountId),
        eq(taxLots.instrumentId, input.instrumentId),
        eq(investmentTransactions.status, "posted"),
        gt(taxLots.remainingQuantity, "0"),
        input.disposedAt ? lte(taxLots.acquiredAt, input.disposedAt) : undefined,
      ))
      .orderBy(asc(taxLots.acquiredAt), asc(taxLots.id));
    const rows = lock
      ? await query.for("update", { of: taxLots })
      : await query;

    if (rows.length === 0) {
      return [];
    }

    const disposed = await this.tx
      .select({
        taxLotId: lotDisposals.taxLotId,
        amount: sql<string>`coalesce(sum(${lotDisposals.costBasisAmount}), 0)::text`,
      })
      .from(lotDisposals)
      .innerJoin(investmentTransactions, eq(investmentTransactions.id, lotDisposals.investmentTransactionId))
      .where(and(inArray(lotDisposals.taxLotId, rows.map((row) => row.id)), eq(investmentTransactions.status, "posted")))
      .groupBy(lotDisposals.taxLotId);
    const disposedByLot = new Map(disposed.map((row) => [row.taxLotId, row.amount]));

    const orderIds = await this.getLotOrderIds(rows.map((row) => row.investmentTransactionId));
    return rows.map((row) => ({
      ...row,
      fifoOrderId: orderIds.get(row.investmentTransactionId) ?? row.id,
      quantity: canonicalDatabaseDecimal(row.quantity),
      remainingQuantity: canonicalDatabaseDecimal(row.remainingQuantity),
      tradeFxRateToEur: row.tradeFxRateToEur,
      disposedCostBasisAmount: disposedByLot.get(row.id) ?? "0",
    })) as OpenLotRecord[];
  }

  async lockOpenLots(input: {
    disposedAt?: Date;
    investmentAccountId: string;
    instrumentId: string;
  }): Promise<OpenLotRecord[]> {
    return this.readOpenLots(input, true);
  }

  async hasLaterPostedDisposal(input: {
    acquiredAt: Date;
    investmentAccountId: string;
    instrumentId: string;
  }): Promise<boolean> {
    const [row] = await this.tx
      .select({ id: investmentTransactions.id })
      .from(investmentTransactions)
      .innerJoin(
        lotDisposals,
        eq(lotDisposals.investmentTransactionId, investmentTransactions.id),
      )
      .where(and(
        eq(investmentTransactions.investmentAccountId, input.investmentAccountId),
        eq(investmentTransactions.instrumentId, input.instrumentId),
        eq(investmentTransactions.type, "sell"),
        eq(investmentTransactions.status, "posted"),
        gt(investmentTransactions.occurredAt, input.acquiredAt),
      ))
      .limit(1)
      .for("update", { of: investmentTransactions });

    return row !== undefined;
  }

  async hasJournalLink(journalTransactionId: string): Promise<boolean> {
    const [row] = await this.tx
      .select({ id: investmentTransactions.id })
      .from(investmentTransactions)
      .where(eq(
        investmentTransactions.journalTransactionId,
        journalTransactionId,
      ))
      .limit(1)
      .for("update");

    return row !== undefined;
  }

  async getTransaction(id: string, lock = false) {
    const query = this.tx.select().from(investmentTransactions)
      .where(eq(investmentTransactions.id, id));
    const [row] = lock ? await query.for("update") : await query;
    if (!row) applicationError("investment_transaction_not_found");
    return row;
  }

  async markCorrected(originalId: string, replacementId: string) {
    await this.tx.update(investmentTransactions)
      .set({ status: "reversed", correctedById: replacementId })
      .where(eq(investmentTransactions.id, originalId));
    // Raw original lots remain available for audit but must never be spendable.
    await this.tx.update(taxLots).set({ remainingQuantity: "0" })
      .where(eq(taxLots.investmentTransactionId, originalId));
  }

  async getLotOrderIds(transactionIds: string[]) {
    if (transactionIds.length === 0) return new Map<string, string>();
    const result = await this.tx.execute(sql`
      with recursive ancestry as (
        select id as leaf_id, id, correction_of_id
        from finance_investment_transactions where id in ${transactionIds}
        union all
        select a.leaf_id, t.id, t.correction_of_id from ancestry a
        join finance_investment_transactions t on t.id=a.correction_of_id
      )
      select a.leaf_id, l.id as lot_id from ancestry a
      join finance_tax_lots l on l.investment_transaction_id=a.id
      where a.correction_of_id is null
    `);
    return new Map(result.rows.map((row) => [String(row.leaf_id), String(row.lot_id)]));
  }

  async resetPairForReplay(input: { investmentAccountId: string; instrumentId: string }) {
    const all = await this.tx.select().from(investmentTransactions)
      .where(and(eq(investmentTransactions.investmentAccountId, input.investmentAccountId),
        eq(investmentTransactions.instrumentId, input.instrumentId)))
      .orderBy(asc(investmentTransactions.occurredAt), asc(investmentTransactions.id))
      .for("update");
    const active = all.filter((row) => row.status === "posted");
    // Disposal allocations are derived. Keep reversed sale allocations as audit data;
    // only the still-active sales are recalculated.
    const sales = active.filter((row) => row.type === "sell");
    if (sales.length) await this.tx.delete(lotDisposals)
      .where(inArray(lotDisposals.investmentTransactionId, sales.map((row) => row.id)));
    const buys = active.filter((row) => row.type === "buy");
    if (buys.length) await this.tx.update(taxLots)
      .set({ remainingQuantity: sql`${taxLots.quantity}` })
      .where(inArray(taxLots.investmentTransactionId, buys.map((row) => row.id)));
    if (sales.length === 0) return sales;
    const roots = await this.tx.execute(sql`
      with recursive ancestry as (
        select id as leaf_id, id, correction_of_id
        from finance_investment_transactions where id in ${sales.map((row) => row.id)}
        union all
        select a.leaf_id, t.id, t.correction_of_id from ancestry a
        join finance_investment_transactions t on t.id=a.correction_of_id
      ) select leaf_id, id from ancestry where correction_of_id is null
    `);
    const order = new Map(roots.rows.map((row) => [String(row.leaf_id), String(row.id)]));
    return sales.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() ||
      (order.get(a.id) ?? a.id).localeCompare(order.get(b.id) ?? b.id));
  }

  async insertTransaction(input: InvestmentTransactionInsert): Promise<void> {
    await this.tx.insert(investmentTransactions).values({
      id: input.id,
      investmentAccountId: input.investmentAccountId,
      instrumentId: input.instrumentId,
      journalTransactionId: input.journalTransactionId ?? null,
      type: input.type,
      status: "posted",
      occurredAt: input.occurredAt,
      quantity: input.quantity ?? null,
      tradeCurrencyCode: input.tradeCurrencyCode,
      grossAmount: input.grossAmount ?? null,
      feeAmount: input.feeAmount ?? null,
      tradeFxRateToEur: input.tradeFxRateToEur,
      correctionOfId: input.correctionOfId ?? null,
    });
  }

  async insertLot(input: {
    id: string;
    investmentTransactionId: string;
    instrumentId: string;
    acquiredAt: Date;
    quantity: string;
    costCurrencyCode: string;
    costAmount: string;
    feeAmount: string;
  }): Promise<void> {
    await this.tx.insert(taxLots).values({
      ...input,
      remainingQuantity: input.quantity,
    });
  }

  async applyDisposals(input: {
    investmentTransactionId: string;
    disposedAt: Date;
    proceedsCurrencyCode: string;
    rows: Array<{
      id: string;
      lotId: string;
      quantity: string;
      proceedsAmount: string;
      costBasisAmount: string;
      remainingQuantity: string;
    }>;
  }): Promise<void> {
    for (const row of input.rows) {
      await this.tx
        .update(taxLots)
        .set({ remainingQuantity: row.remainingQuantity })
        .where(eq(taxLots.id, row.lotId));
      await this.tx.insert(lotDisposals).values({
        id: row.id,
        taxLotId: row.lotId,
        investmentTransactionId: input.investmentTransactionId,
        disposedAt: input.disposedAt,
        quantity: row.quantity,
        proceedsCurrencyCode: input.proceedsCurrencyCode,
        proceedsAmount: row.proceedsAmount,
        costBasisAmount: row.costBasisAmount,
      });
    }
  }

  async getOpenLots(input: {
    investmentAccountId: string;
    instrumentId: string;
  }): Promise<PerformanceLotRecord[]> {
    return this.lockOpenLots(input);
  }

  async getOpenLotsSnapshot(input: {
    investmentAccountId: string;
    instrumentId: string;
  }): Promise<PerformanceLotRecord[]> {
    return this.readOpenLots(input, false);
  }

  async getRealizedDisposals(input: {
    investmentAccountId: string;
    instrumentId: string;
  }): Promise<RealizedDisposalRecord[]> {
    const buyTransactions = alias(investmentTransactions, "buy_transactions");
    const rows = await this.tx
      .select({
        proceedsAmount: lotDisposals.proceedsAmount,
        costBasisAmount: lotDisposals.costBasisAmount,
        proceedsCurrencyCode: lotDisposals.proceedsCurrencyCode,
        saleFxRateToEur: investmentTransactions.tradeFxRateToEur,
        costCurrencyCode: taxLots.costCurrencyCode,
        acquisitionFxRateToEur: buyTransactions.tradeFxRateToEur,
      })
      .from(lotDisposals)
      .innerJoin(
        investmentTransactions,
        eq(investmentTransactions.id, lotDisposals.investmentTransactionId),
      )
      .innerJoin(taxLots, eq(taxLots.id, lotDisposals.taxLotId))
      .innerJoin(
        buyTransactions,
        eq(buyTransactions.id, taxLots.investmentTransactionId),
      )
      .where(and(
        eq(investmentTransactions.investmentAccountId, input.investmentAccountId),
        eq(investmentTransactions.instrumentId, input.instrumentId),
        eq(investmentTransactions.status, "posted"),
        eq(buyTransactions.status, "posted"),
      ));

    return rows.map((row) => ({
      ...row,
      saleFxRateToEur: row.saleFxRateToEur,
      acquisitionFxRateToEur: row.acquisitionFxRateToEur,
    }));
  }
}
