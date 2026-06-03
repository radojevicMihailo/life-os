import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  assetGroup,
  bucket,
  currency,
  transaction,
} from "@/db/schema/finance";
import { getEurPerUnitLatest } from "./fx";
import {
  computeBucketTotals,
  computeGroupTotals,
  type BucketTotal,
  type GroupTotal,
} from "./aggregations";

export type PortfolioRow = {
  accountId: string;
  groupId: string | null;
  groupName: string | null;
  bucketId: string | null;
  bucketName: string | null;
  assetName: string;
  amount: number;
  currencyCode: string | null;
  priceEur: number | null;
  totalEur: number | null;
  share: number | null;
};

export type BucketDisplay = BucketTotal & {
  displayCode: "EUR" | "RSD";
  displayAmount: number;
};

export type Portfolio = {
  rows: PortfolioRow[];
  netWorthEur: number;
  groupTotals: GroupTotal[];
  bucketTotals: BucketDisplay[];
};

const RSD_BUCKETS = new Set(["potrazivanja", "gotovina rsd", "dinarski racun raiffeisen"]);

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export async function getPortfolio(): Promise<Portfolio> {
  const balances = await db.execute<{
    account_id: string;
    account_name: string;
    group_id: string | null;
    group_name: string | null;
    bucket_id: string | null;
    bucket_name: string | null;
    currency_code: string | null;
    balance: string;
  }>(sql`
    WITH inflows AS (
      SELECT ${transaction.toAccountId} AS account_id,
             COALESCE(SUM(${transaction.inflowAmount}), 0) AS amount
      FROM ${transaction}
      WHERE ${transaction.toAccountId} IS NOT NULL
        AND ${transaction.inflowAmount} IS NOT NULL
      GROUP BY ${transaction.toAccountId}
    ),
    outflows AS (
      SELECT ${transaction.fromAccountId} AS account_id,
             COALESCE(SUM(${transaction.outflowAmount}), 0) AS amount
      FROM ${transaction}
      WHERE ${transaction.fromAccountId} IS NOT NULL
        AND ${transaction.outflowAmount} IS NOT NULL
      GROUP BY ${transaction.fromAccountId}
    )
    SELECT a.id AS account_id,
           a.name AS account_name,
           ag.id AS group_id,
           ag.name AS group_name,
           bk.id AS bucket_id,
           bk.name AS bucket_name,
           c.code AS currency_code,
           (COALESCE(i.amount, 0) - COALESCE(o.amount, 0))::text AS balance
    FROM ${account} a
    LEFT JOIN ${assetGroup} ag ON ag.id = a.asset_group_id
    LEFT JOIN ${bucket} bk ON bk.id = a.bucket_id
    LEFT JOIN ${currency} c ON c.id = a.currency_id
    LEFT JOIN inflows i ON i.account_id = a.id
    LEFT JOIN outflows o ON o.account_id = a.id
    WHERE a.archived_at IS NULL
    ORDER BY ag.sort_order NULLS LAST, ag.name NULLS LAST, a.sort_order, a.name
  `);

  const raw = balances.rows.map((r) => ({
    accountId: r.account_id,
    groupId: r.group_id,
    groupName: r.group_name,
    bucketId: r.bucket_id,
    bucketName: r.bucket_name,
    assetName: r.account_name,
    amount: Number(r.balance),
    currencyCode: r.currency_code,
  }));

  const codes = new Set(
    raw.filter((r) => r.amount !== 0 && r.currencyCode).map((r) => r.currencyCode as string),
  );
  const prices = new Map<string, number | null>();
  await Promise.all(
    Array.from(codes).map(async (c) => {
      prices.set(c, await getEurPerUnitLatest(c));
    }),
  );

  const withTotals = raw.map((r) => {
    const price = r.currencyCode ? prices.get(r.currencyCode) ?? null : null;
    const total = price != null ? r.amount * price : null;
    return {
      ...r,
      priceEur: price,
      totalEur: total,
    };
  });

  const netWorthEur = withTotals.reduce(
    (sum, r) => sum + (r.totalEur ?? 0),
    0,
  );

  const rows: PortfolioRow[] = withTotals.map((r) => ({
    ...r,
    share: netWorthEur > 0 && r.totalEur != null ? r.totalEur / netWorthEur : null,
  }));

  const eurRows = withTotals
    .filter((r) => r.totalEur != null && r.totalEur !== 0)
    .map((r) => ({
      accountId: r.accountId,
      groupId: r.groupId,
      groupName: r.groupName,
      bucketId: r.bucketId,
      bucketName: r.bucketName,
      eur: r.totalEur as number,
    }));

  const bucketTotalsRaw = computeBucketTotals(eurRows);
  const eurPerRsd = bucketTotalsRaw.some((b) => RSD_BUCKETS.has(normalize(b.name)))
    ? await getEurPerUnitLatest("RSD")
    : null;

  const bucketTotals: BucketDisplay[] = bucketTotalsRaw.map((b) => {
    if (RSD_BUCKETS.has(normalize(b.name)) && eurPerRsd && eurPerRsd > 0) {
      return { ...b, displayCode: "RSD", displayAmount: b.eur / eurPerRsd };
    }
    return { ...b, displayCode: "EUR", displayAmount: b.eur };
  });

  return {
    rows,
    netWorthEur,
    groupTotals: computeGroupTotals(eurRows),
    bucketTotals,
  };
}
