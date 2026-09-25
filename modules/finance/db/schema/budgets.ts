import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { currencies } from "./catalog";
import { categories } from "./ledger";

export const budgetLimits = pgTable(
  "finance_budget_limits",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    month: date("month").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    amount: numeric("amount", { precision: 38, scale: 18 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("budget_limits_amount_positive_check", sql`${table.amount} > 0`),
    uniqueIndex("budget_limits_category_month_unique_idx").on(
      table.categoryId,
      table.month,
    ),
  ],
);

export const budgetPeriods = pgTable(
  "finance_budget_periods",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    month: date("month").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    limitAmount: numeric("limit_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    carryInAmount: numeric("carry_in_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    spendingAmount: numeric("spending_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    remainingAmount: numeric("remaining_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    recomputedAt: timestamp("recomputed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("budget_periods_category_month_unique_idx").on(
      table.categoryId,
      table.month,
    ),
    index("budget_periods_recompute_idx").on(table.categoryId, table.month),
  ],
);
