import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { currencies } from "./catalog";
import { instruments } from "./investments";

export const providerRecordStatus = pgEnum("finance_provider_record_status", [
  "valid",
  "stale",
  "failed",
]);

export const manualOverrideKind = pgEnum("finance_manual_override_kind", [
  "exchange_rate",
  "market_quote",
]);

export const exchangeRates = pgTable(
  "finance_exchange_rates",
  {
    id: text("id").primaryKey(),
    baseCurrencyCode: text("base_currency_code")
      .notNull()
      .references(() => currencies.code),
    quoteCurrencyCode: text("quote_currency_code")
      .notNull()
      .references(() => currencies.code),
    rate: numeric("rate", { precision: 38, scale: 18 }).notNull(),
    provider: text("provider").notNull(),
    providerTimestamp: timestamp("provider_timestamp", {
      withTimezone: true,
    }).notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    status: providerRecordStatus("status").notNull(),
    rawPayload: jsonb("raw_payload"),
  },
  (table) => [
    check("exchange_rates_rate_positive_check", sql`${table.rate} > 0`),
    index("exchange_rates_lookup_idx").on(
      table.baseCurrencyCode,
      table.quoteCurrencyCode,
      table.providerTimestamp.desc(),
      table.id,
    ),
  ],
);

export const marketQuotes = pgTable(
  "finance_market_quotes",
  {
    id: text("id").primaryKey(),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instruments.id),
    quoteCurrencyCode: text("quote_currency_code")
      .notNull()
      .references(() => currencies.code),
    price: numeric("price", { precision: 38, scale: 18 }).notNull(),
    provider: text("provider").notNull(),
    providerTimestamp: timestamp("provider_timestamp", {
      withTimezone: true,
    }).notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    status: providerRecordStatus("status").notNull(),
    rawPayload: jsonb("raw_payload"),
  },
  (table) => [
    check("market_quotes_price_positive_check", sql`${table.price} > 0`),
    index("market_quotes_lookup_idx").on(
      table.instrumentId,
      table.quoteCurrencyCode,
      table.providerTimestamp.desc(),
      table.id,
    ),
  ],
);

export const manualValuationOverrides = pgTable(
  "finance_manual_valuation_overrides",
  {
    id: text("id").primaryKey(),
    kind: manualOverrideKind("kind").notNull(),
    baseCurrencyCode: text("base_currency_code").references(
      () => currencies.code,
    ),
    quoteCurrencyCode: text("quote_currency_code").references(
      () => currencies.code,
    ),
    instrumentId: text("instrument_id").references(() => instruments.id),
    value: numeric("value", { precision: 38, scale: 18 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "manual_valuation_overrides_value_positive_check",
      sql`${table.value} > 0`,
    ),
    check(
      "manual_valuation_overrides_target_check",
      sql`(${table.kind} = 'exchange_rate' and ${table.baseCurrencyCode} is not null and ${table.quoteCurrencyCode} is not null and ${table.instrumentId} is null) or (${table.kind} = 'market_quote' and ${table.instrumentId} is not null and ${table.baseCurrencyCode} is null)`,
    ),
    uniqueIndex("manual_valuation_overrides_active_unique_idx")
      .on(
        table.kind,
        table.baseCurrencyCode,
        table.quoteCurrencyCode,
        table.instrumentId,
      )
      .where(sql`${table.clearedAt} is null`),
  ],
);

export const providerRefreshRuns = pgTable(
  "finance_provider_refresh_runs",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: providerRecordStatus("status").notNull(),
    attemptedCount: integer("attempted_count").notNull().default(0),
    succeededCount: integer("succeeded_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    error: text("error"),
  },
  (table) => [
    check(
      "provider_refresh_runs_counts_nonnegative_check",
      sql`${table.attemptedCount} >= 0 and ${table.succeededCount} >= 0 and ${table.failedCount} >= 0`,
    ),
    index("provider_refresh_runs_provider_started_idx").on(
      table.provider,
      table.startedAt.desc(),
    ),
  ],
);
