import { sql } from "drizzle-orm";
import { boolean, check, date, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { accounts, categories, journalTransactions } from "./ledger";
import type { Frequency } from "../../domain/planning";
export const planRules = pgTable("finance_plan_rules", {
    id: text("id").primaryKey(), name: text("name").notNull(), type: text("type").$type<"income" | "expense">().notNull(),
    accountId: text("account_id").notNull().references(() => accounts.id), categoryId: text("category_id").notNull().references(() => categories.id),
    amount: numeric("amount", { precision: 38, scale: 18 }).notNull(), startDate: date("start_date").notNull(), endDate: date("end_date"),
    frequency: text("frequency").$type<Frequency>().notNull(), isPrimaryIncome: boolean("is_primary_income").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [check("plan_positive", sql `${t.amount}>0`), check("plan_type", sql `${t.type} in ('income','expense')`), check("plan_frequency", sql `${t.frequency} in ('once','weekly','monthly','yearly')`), check("plan_date_range", sql `${t.startDate} between '1900-01-01' and '2100-12-31' and (${t.endDate} is null or ${t.endDate} between ${t.startDate} and '2100-12-31')`), check("plan_income_flag", sql `not ${t.isPrimaryIncome} or ${t.type}='income'`), index("plan_account_idx").on(t.accountId), index("plan_category_idx").on(t.categoryId)]);
export interface OccurrenceSnapshot {
    name: string;
    type: "income" | "expense";
    accountId: string;
    categoryId: string;
    amount: string;
    currencyCode: string;
    occurredAt: string;
    accountName: string;
    categoryName: string;
    isPrimaryIncome: boolean;
}
export const planOccurrences = pgTable("finance_plan_occurrences", {
    id: text("id").primaryKey(), ruleId: text("rule_id").notNull().references(() => planRules.id), dueDate: date("due_date").notNull(),
    status: text("status").$type<"confirmed" | "skipped">().notNull(), journalTransactionId: text("journal_transaction_id").references(() => journalTransactions.id), snapshot: jsonb("snapshot").$type<OccurrenceSnapshot>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("plan_occurrence_unique").on(t.ruleId, t.dueDate), uniqueIndex("plan_occurrence_journal_unique").on(t.journalTransactionId), check("plan_occurrence_status", sql `(${t.status}='confirmed' and ${t.journalTransactionId} is not null and ${t.snapshot} is not null) or (${t.status}='skipped' and ${t.journalTransactionId} is null)`)]);
export const cashAccountPreferences = pgTable("finance_cash_account_preferences", { accountId: text("account_id").primaryKey().references(() => accounts.id), included: boolean("included").notNull() });
