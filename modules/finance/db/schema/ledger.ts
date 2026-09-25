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

export const journalTransactionStatus = pgEnum("finance_journal_transaction_status", [
  "draft",
  "posted",
  "reversed",
]);

export const journalTransactionSource = pgEnum("finance_journal_transaction_source", [
  "web",
  "shortcut",
  "seed",
  "system",
]);

export const journalTransactionType = pgEnum("finance_journal_transaction_type", [
  "income",
  "expense",
  "transfer",
  "foreign_exchange",
  "opening_balance",
  "correction",
  "receivable_out",
  "receivable_repayment",
  "investment_trade",
  "fee",
]);

export const accounts = pgTable(
  "finance_accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    classification: text("classification").notNull(),
    subtype: text("subtype").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    isSystem: boolean("is_system").notNull().default(false),
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
      "accounts_classification_check",
      sql`${table.classification} in ('asset', 'liability', 'receivable', 'equity', 'income', 'expense')`,
    ),
    check(
      "accounts_archived_at_consistency_check",
      sql`(${table.isActive} and ${table.archivedAt} is null) or (not ${table.isActive} and ${table.archivedAt} is not null)`,
    ),
    uniqueIndex("accounts_active_name_unique_idx")
      .on(table.name)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const categories = pgTable(
  "finance_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    classification: text("classification").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
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
      "categories_classification_check",
      sql`${table.classification} in ('income', 'expense')`,
    ),
    check(
      "categories_archived_at_consistency_check",
      sql`(${table.isActive} and ${table.archivedAt} is null) or (not ${table.isActive} and ${table.archivedAt} is not null)`,
    ),
    uniqueIndex("categories_active_name_unique_idx")
      .on(table.name)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const journalTransactions = pgTable(
  "finance_journal_transactions",
  {
    id: text("id").primaryKey(),
    type: journalTransactionType("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    description: text("description"),
    source: journalTransactionSource("source").notNull(),
    status: journalTransactionStatus("status").notNull().default("posted"),
    correctionOfId: text("correction_of_id").references(
      (): AnyPgColumn => journalTransactions.id,
    ),
    correctedById: text("corrected_by_id").references(
      (): AnyPgColumn => journalTransactions.id,
    ),
    externalReference: text("external_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("journal_transactions_occurred_at_idx").on(
      table.occurredAt.desc(),
      table.id,
    ),
  ],
);

export const journalPostings = pgTable(
  "finance_journal_postings",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => journalTransactions.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    amount: numeric("amount", { precision: 38, scale: 18 }).notNull(),
    categoryId: text("category_id").references(() => categories.id),
    counterparty: text("counterparty"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("journal_postings_amount_nonzero_check", sql`${table.amount} <> 0`),
    index("journal_postings_account_occurred_idx").on(
      table.accountId,
      table.transactionId,
    ),
  ],
);
