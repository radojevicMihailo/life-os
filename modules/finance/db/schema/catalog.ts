import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const currencies = pgTable(
  "finance_currencies",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    minorUnit: text("minor_unit").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("currencies_code_iso_check", sql`${table.code} ~ '^[A-Z]{3}$'`),
    check(
      "currencies_active_timestamp_check",
      sql`(${table.isActive} and ${table.activatedAt} is not null) or (not ${table.isActive})`,
    ),
  ],
);
