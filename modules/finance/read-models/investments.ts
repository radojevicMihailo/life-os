import Decimal from "decimal.js";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { ApplicationDependencies } from "../application/ports";
import { valueNetWorthEur } from "../application/valuation";
import {
  instruments,
  investmentAccounts,
  investmentTransactions,
  lotDisposals,
  taxLots,
} from "../db/schema";
import { canonicalDecimal, type NetWorthSnapshot } from "./common";

const LIST_LIMIT = 100;

export function calculateRealizedReturnEur(
  rows: Array<{
    acquisitionFxRateToEur: string;
    costBasisAmount: string;
    proceedsAmount: string;
    saleFxRateToEur: string;
  }>,
) {
  return canonicalDecimal(
    rows.reduce(
      (total, row) =>
        total
          .plus(new Decimal(row.proceedsAmount).times(row.saleFxRateToEur))
          .minus(
            new Decimal(row.costBasisAmount).times(
              row.acquisitionFxRateToEur,
            ),
          ),
      new Decimal(0),
    ),
  );
}

export interface OpenPositionRow {
  accountName: string;
  class: string;
  instrumentId: string;
  investmentAccountId: string;
  name: string;
  quantity: string;
  quoteCurrencyCode: string;
  symbol: string;
}

export function mergePositionValuations(
  openPositions: OpenPositionRow[],
  valuations: NetWorthSnapshot["investments"],
) {
  const valuationByKey = new Map(
    valuations.map((position) => [
      `${position.investmentAccountId}:${position.instrumentId}`,
      position,
    ]),
  );

  return openPositions.map((position) => {
    const valuation = valuationByKey.get(
      `${position.investmentAccountId}:${position.instrumentId}`,
    );

    if (!valuation) {
      return {
        ...position,
        costBasisEur: null,
        marketValue: null,
        marketValueCurrencyCode: position.quoteCurrencyCode,
        marketValueEur: null,
        quote: null,
        realizedReturnEur: null,
        reportingFx: null,
        unrealizedReturnEur: null,
        valuationMissing: true,
      };
    }

    return {
      ...position,
      costBasisEur: valuation.openCostBasis.reportingAmount,
      marketValue: valuation.nativeAmount,
      marketValueCurrencyCode: valuation.nativeCurrencyCode,
      marketValueEur: valuation.eurAmount,
      quantity: valuation.quantity,
      quote: valuation.quote,
      realizedReturnEur: valuation.realizedReturn.reportingAmount,
      reportingFx: valuation.reportingFx,
      unrealizedReturnEur: valuation.unrealizedReturn.reportingAmount,
      valuationMissing: false,
    };
  });
}

export async function listInvestments(
  dependencies: ApplicationDependencies,
  valuationOptions: {
    exchangeRateStaleAfterMs: number;
    marketDataStaleAfterMs: number;
  },
  valuationSnapshot?: NetWorthSnapshot,
) {
  const valuation =
    valuationSnapshot ?? (await valueNetWorthEur(dependencies, valuationOptions));

  return dependencies.unitOfWork.run(async (tx) => {
    const quantity = sql<string>`sum(case when ${investmentTransactions.type} = 'buy' then ${investmentTransactions.quantity} when ${investmentTransactions.type} = 'sell' then -${investmentTransactions.quantity} else 0 end)`;
    const openPositions = await tx
      .select({
        accountName: investmentAccounts.name,
        class: instruments.class,
        instrumentId: instruments.id,
        investmentAccountId: investmentAccounts.id,
        name: instruments.name,
        quantity,
        quoteCurrencyCode: instruments.quoteCurrencyCode,
        symbol: instruments.symbol,
      })
      .from(investmentTransactions)
      .innerJoin(
        instruments,
        eq(instruments.id, investmentTransactions.instrumentId),
      )
      .innerJoin(
        investmentAccounts,
        eq(investmentAccounts.id, investmentTransactions.investmentAccountId),
      )
      .where(eq(investmentTransactions.status, "posted"))
      .groupBy(
        investmentAccounts.id,
        instruments.id,
      )
      .having(sql`${quantity} > 0`)
      .orderBy(instruments.symbol, investmentAccounts.name);
    const lotRows = await tx
      .select({
        acquiredAt: taxLots.acquiredAt,
        costAmount: taxLots.costAmount,
        costCurrencyCode: taxLots.costCurrencyCode,
        feeAmount: taxLots.feeAmount,
        id: taxLots.id,
        instrumentId: taxLots.instrumentId,
        investmentAccountId: investmentTransactions.investmentAccountId,
        quantity: taxLots.quantity,
        remainingQuantity: taxLots.remainingQuantity,
      })
      .from(taxLots)
      .innerJoin(
        investmentTransactions,
        eq(investmentTransactions.id, taxLots.investmentTransactionId),
      )
      .orderBy(desc(taxLots.acquiredAt), taxLots.id)
      .limit(LIST_LIMIT + 1);
    const activityRows = await tx
      .select({
        accountName: investmentAccounts.name,
        feeAmount: investmentTransactions.feeAmount,
        grossAmount: investmentTransactions.grossAmount,
        id: investmentTransactions.id,
        occurredAt: investmentTransactions.occurredAt,
        quantity: investmentTransactions.quantity,
        status: investmentTransactions.status,
        symbol: instruments.symbol,
        tradeCurrencyCode: investmentTransactions.tradeCurrencyCode,
        type: investmentTransactions.type,
      })
      .from(investmentTransactions)
      .innerJoin(
        instruments,
        eq(instruments.id, investmentTransactions.instrumentId),
      )
      .innerJoin(
        investmentAccounts,
        eq(investmentAccounts.id, investmentTransactions.investmentAccountId),
      )
      .orderBy(
        desc(investmentTransactions.occurredAt),
        desc(investmentTransactions.id),
      )
      .limit(LIST_LIMIT + 1);
    const buyTransactions = alias(
      investmentTransactions,
      "read_model_buy_transactions",
    );
    const realizedRows = await tx
      .select({
        acquisitionFxRateToEur: buyTransactions.tradeFxRateToEur,
        costBasisAmount: lotDisposals.costBasisAmount,
        proceedsAmount: lotDisposals.proceedsAmount,
        saleFxRateToEur: investmentTransactions.tradeFxRateToEur,
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
      .where(
        and(
          eq(investmentTransactions.status, "posted"),
          eq(buyTransactions.status, "posted"),
        ),
      );
    const lots = lotRows.slice(0, LIST_LIMIT);
    const activity = activityRows.slice(0, LIST_LIMIT);

    const positions = mergePositionValuations(
      openPositions.map((position) => ({
        ...position,
        quantity: canonicalDecimal(position.quantity, 24),
      })),
      valuation.investments,
    );
    const total = (
      field:
        | "costBasisEur"
        | "marketValueEur"
        | "realizedReturnEur"
        | "unrealizedReturnEur",
    ) => {
      if (positions.some((position) => position[field] === null)) return null;
      return canonicalDecimal(
        positions.reduce(
          (sum, position) => sum.plus(position[field] ?? "0"),
          new Decimal(0),
        ),
      );
    };

    return {
      activity: activity.map((row) => ({
        ...row,
        feeAmount: row.feeAmount ? canonicalDecimal(row.feeAmount) : null,
        grossAmount: row.grossAmount ? canonicalDecimal(row.grossAmount) : null,
        quantity: row.quantity ? canonicalDecimal(row.quantity, 24) : null,
      })),
      complete:
        valuation.missingQuotes.length === 0 &&
        valuation.missingConversions.length === 0,
      lots: lots.map((lot) => ({
        ...lot,
        costAmount: canonicalDecimal(lot.costAmount),
        feeAmount: canonicalDecimal(lot.feeAmount),
        quantity: canonicalDecimal(lot.quantity, 24),
        remainingQuantity: canonicalDecimal(lot.remainingQuantity, 24),
      })),
      positions,
      pagination: {
        activityHasMore: activityRows.length > LIST_LIMIT,
        limit: LIST_LIMIT,
        lotsHasMore: lotRows.length > LIST_LIMIT,
      },
      totals: {
        costBasisEur: total("costBasisEur"),
        marketValueEur: total("marketValueEur"),
        realizedReturnEur: calculateRealizedReturnEur(realizedRows),
        unrealizedReturnEur: total("unrealizedReturnEur"),
      },
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}
