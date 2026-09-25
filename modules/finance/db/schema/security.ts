import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { journalTransactions } from "./ledger";

export const accessSettingKind = pgEnum("finance_access_setting_kind", [
  "web_access_token",
  "shortcut_token",
  "session_signing",
]);

export const idempotencyStatus = pgEnum("finance_idempotency_status", [
  "started",
  "completed",
  "failed",
]);

export const accessSettings = pgTable(
  "finance_access_settings",
  {
    id: text("id").primaryKey(),
    kind: accessSettingKind("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    version: text("version").notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("access_settings_kind_unique_idx").on(table.kind),
  ],
);

export const idempotencyRecords = pgTable(
  "finance_idempotency_records",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    status: idempotencyStatus("status").notNull(),
    resultTransactionId: text("result_transaction_id").references(
      () => journalTransactions.id,
    ),
    responseBody: jsonb("response_body"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "idempotency_records_completed_consistency_check",
      sql`(${table.status} = 'completed' and ${table.completedAt} is not null) or (${table.status} <> 'completed')`,
    ),
    uniqueIndex("idempotency_records_scope_key_idx").on(table.scope, table.key),
  ],
);
