import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { currencies } from "./catalog";
import { accounts } from "./ledger";

export const goals = pgTable(
  "finance_goals",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    targetCurrencyCode: text("target_currency_code")
      .notNull()
      .references(() => currencies.code),
    targetAmount: numeric("target_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
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
    check("goals_target_amount_positive_check", sql`${table.targetAmount} > 0`),
    check(
      "goals_archived_at_consistency_check",
      sql`(${table.isActive} and ${table.archivedAt} is null) or (not ${table.isActive} and ${table.archivedAt} is not null)`,
    ),
  ],
);
