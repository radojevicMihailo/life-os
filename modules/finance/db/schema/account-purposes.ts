import { sql } from "drizzle-orm";
import { check, index, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { accounts } from "./ledger";
import { goals } from "./goals";
import { budgetLimits } from "./budgets";
import { currencies } from "./catalog";

export const accountPurposes = pgTable("finance_account_purposes", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id),
  currencyCode: text("currency_code").notNull().references(() => currencies.code),
  goalId: text("goal_id").references(() => goals.id),
  budgetLimitId: text("budget_limit_id").references(() => budgetLimits.id),
  amount: numeric("amount", { precision: 38, scale: 18 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("account_purposes_amount_positive_check", sql`${table.amount} > 0`),
  check("account_purposes_one_target_check", sql`num_nonnulls(${table.goalId}, ${table.budgetLimitId}) = 1`),
  index("account_purposes_account_idx").on(table.accountId),
  uniqueIndex("account_purposes_goal_unique_idx").on(table.accountId, table.goalId),
  uniqueIndex("account_purposes_budget_unique_idx").on(table.accountId, table.budgetLimitId),
]);
