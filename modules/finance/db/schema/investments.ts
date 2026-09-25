import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { currencies } from "./catalog";
import { accounts, journalTransactions } from "./ledger";

export const instrumentClass = pgEnum("finance_instrument_class", [
  "stock",
  "etf",
  "crypto",
  "bond",
  "real_estate",
  "precious_metal",
  "manual",
]);

export const instrumentValuationMethod = pgEnum("finance_instrument_valuation_method", [
  "market_quote",
  "manual",
]);

export const investmentTransactionType = pgEnum("finance_investment_transaction_type", [
  "buy",
  "sell",
  "dividend",
  "fee",
]);

export const investmentTransactionStatus = pgEnum(
  "finance_investment_transaction_status",
  ["posted", "reversed"],
);

export const instruments = pgTable(
  "finance_instruments",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    class: instrumentClass("class").notNull(),
    valuationMethod: instrumentValuationMethod("valuation_method")
      .notNull()
      .default("market_quote"),
    quoteCurrencyCode: text("quote_currency_code")
      .notNull()
      .references(() => currencies.code),
    provider: text("provider"),
    providerId: text("provider_id"),
    isin: text("isin"),
    exchange: text("exchange"),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "instruments_archived_at_consistency_check",
      sql`(${table.isActive} and ${table.archivedAt} is null) or (not ${table.isActive} and ${table.archivedAt} is not null)`,
    ),
    uniqueIndex("instruments_symbol_unique_idx").on(table.symbol),
    uniqueIndex("instruments_provider_id_unique_idx")
      .on(table.provider, table.providerId)
      .where(sql`${table.provider} is not null and ${table.providerId} is not null`),
  ],
);

export const investmentAccounts = pgTable(
  "finance_investment_accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cashAccountId: text("cash_account_id")
      .notNull()
      .references(() => accounts.id),
    provider: text("provider"),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "investment_accounts_archived_at_consistency_check",
      sql`(${table.isActive} and ${table.archivedAt} is null) or (not ${table.isActive} and ${table.archivedAt} is not null)`,
    ),
    uniqueIndex("investment_accounts_active_name_unique_idx")
      .on(table.name)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const investmentTransactions = pgTable(
  "finance_investment_transactions",
  {
    id: text("id").primaryKey(),
    investmentAccountId: text("investment_account_id")
      .notNull()
      .references(() => investmentAccounts.id),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instruments.id),
    journalTransactionId: text("journal_transaction_id").references(
      () => journalTransactions.id,
    ),
    type: investmentTransactionType("type").notNull(),
    status: investmentTransactionStatus("status").notNull().default("posted"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    quantity: numeric("quantity", { precision: 48, scale: 24 }),
    tradeCurrencyCode: text("trade_currency_code")
      .notNull()
      .references(() => currencies.code),
    grossAmount: numeric("gross_amount", { precision: 38, scale: 18 }),
    feeAmount: numeric("fee_amount", { precision: 38, scale: 18 }),
    tradeFxRateToEur: numeric("trade_fx_rate_to_eur", {
      precision: 38,
      scale: 18,
    }).notNull(),
    correctionOfId: text("correction_of_id").references(
      (): AnyPgColumn => investmentTransactions.id,
    ),
    correctedById: text("corrected_by_id").references(
      (): AnyPgColumn => investmentTransactions.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("investment_transactions_account_occurred_idx").on(
      table.investmentAccountId,
      table.occurredAt.desc(),
      table.id,
    ),
  ],
);

export const taxLots = pgTable(
  "finance_tax_lots",
  {
    id: text("id").primaryKey(),
    investmentTransactionId: text("investment_transaction_id")
      .notNull()
      .references(() => investmentTransactions.id),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instruments.id),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
    quantity: numeric("quantity", { precision: 48, scale: 24 }).notNull(),
    remainingQuantity: numeric("remaining_quantity", {
      precision: 48,
      scale: 24,
    }).notNull(),
    costCurrencyCode: text("cost_currency_code")
      .notNull()
      .references(() => currencies.code),
    costAmount: numeric("cost_amount", { precision: 38, scale: 18 }).notNull(),
    feeAmount: numeric("fee_amount", { precision: 38, scale: 18 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("tax_lots_quantity_positive_check", sql`${table.quantity} > 0`),
    check(
      "tax_lots_remaining_quantity_check",
      sql`${table.remainingQuantity} >= 0 and ${table.remainingQuantity} <= ${table.quantity}`,
    ),
    index("tax_lots_open_fifo_idx")
      .on(table.instrumentId, table.acquiredAt, table.id)
      .where(sql`${table.remainingQuantity} > 0`),
  ],
);

export const lotDisposals = pgTable(
  "finance_lot_disposals",
  {
    id: text("id").primaryKey(),
    taxLotId: text("tax_lot_id")
      .notNull()
      .references(() => taxLots.id),
    investmentTransactionId: text("investment_transaction_id")
      .notNull()
      .references(() => investmentTransactions.id),
    disposedAt: timestamp("disposed_at", { withTimezone: true }).notNull(),
    quantity: numeric("quantity", { precision: 48, scale: 24 }).notNull(),
    proceedsCurrencyCode: text("proceeds_currency_code")
      .notNull()
      .references(() => currencies.code),
    proceedsAmount: numeric("proceeds_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    costBasisAmount: numeric("cost_basis_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("lot_disposals_quantity_positive_check", sql`${table.quantity} > 0`),
  ],
);
