import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const TRANSACTION_TYPE_COLORS = [
  "red",
  "green",
  "yellow",
  "blue",
  "gray",
  "purple",
  "orange",
  "pink",
] as const;
export type TransactionTypeColor = (typeof TRANSACTION_TYPE_COLORS)[number];

export const categoryKindEnum = pgEnum("finance_category_kind", [
  "income",
  "expense",
  "investment",
]);
export type CategoryKind = (typeof categoryKindEnum.enumValues)[number];

export const categoryKindLabel: Record<CategoryKind, string> = {
  income: "Kategorije za Prihod",
  expense: "Kategorije za Trošak",
  investment: "Kategorije za Investicije",
};

export const transactionType = pgTable(
  "finance_transaction_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    color: text("color").notNull().default("gray"),
    categoryKind: categoryKindEnum("category_kind"),
    showsFrom: boolean("shows_from").notNull().default(true),
    showsTo: boolean("shows_to").notNull().default(true),
    showsOutflow: boolean("shows_outflow").notNull().default(true),
    showsInflow: boolean("shows_inflow").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("finance_transaction_type_key_idx").on(t.key)],
);

export const currency = pgTable(
  "finance_currencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("finance_currency_code_idx").on(t.code)],
);

export const assetGroup = pgTable(
  "finance_asset_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("finance_asset_group_name_idx").on(t.name)],
);

export const bucket = pgTable(
  "finance_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    assetGroupId: uuid("asset_group_id").references(() => assetGroup.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("finance_bucket_name_idx").on(t.name),
    index("finance_bucket_group_idx").on(t.assetGroupId),
  ],
);

export const account = pgTable(
  "finance_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    assetGroupId: uuid("asset_group_id").references(() => assetGroup.id, {
      onDelete: "set null",
    }),
    bucketId: uuid("bucket_id").references(() => bucket.id, {
      onDelete: "set null",
    }),
    currencyId: uuid("currency_id").references(() => currency.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("finance_account_name_idx").on(t.name),
    index("finance_account_group_idx").on(t.assetGroupId),
    index("finance_account_currency_idx").on(t.currencyId),
    index("finance_account_bucket_idx").on(t.bucketId),
  ],
);

export const transactionCategory = pgTable(
  "finance_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: categoryKindEnum("kind").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("finance_category_kind_name_idx").on(t.kind, t.name)],
);

export const transactionSubcategory = pgTable(
  "finance_subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => transactionCategory.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("finance_subcategory_cat_name_idx").on(t.categoryId, t.name)],
);

export const transaction = pgTable(
  "finance_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredOn: date("occurred_on").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => transactionCategory.id, {
      onDelete: "set null",
    }),
    subcategoryId: uuid("subcategory_id").references(() => transactionSubcategory.id, {
      onDelete: "set null",
    }),
    fromAccountId: uuid("from_account_id").references(() => account.id, {
      onDelete: "set null",
    }),
    toAccountId: uuid("to_account_id").references(() => account.id, {
      onDelete: "set null",
    }),
    outflowAmount: numeric("outflow_amount", { precision: 24, scale: 8 }),
    outflowCurrencyId: uuid("outflow_currency_id").references(() => currency.id, {
      onDelete: "set null",
    }),
    inflowAmount: numeric("inflow_amount", { precision: 24, scale: 8 }),
    inflowCurrencyId: uuid("inflow_currency_id").references(() => currency.id, {
      onDelete: "set null",
    }),
    eurRate: numeric("eur_rate", { precision: 24, scale: 8 }),
    eurAmount: numeric("eur_amount", { precision: 24, scale: 8 }),
    usdRate: numeric("usd_rate", { precision: 24, scale: 8 }),
    usdAmount: numeric("usd_amount", { precision: 24, scale: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("finance_tx_date_idx").on(t.occurredOn),
    index("finance_tx_category_idx").on(t.categoryId),
    index("finance_tx_from_idx").on(t.fromAccountId),
    index("finance_tx_to_idx").on(t.toAccountId),
    index("finance_tx_subcategory_idx").on(t.subcategoryId),
  ],
);

export type Currency = typeof currency.$inferSelect;
export type AssetGroup = typeof assetGroup.$inferSelect;
export type Bucket = typeof bucket.$inferSelect;
export type Account = typeof account.$inferSelect;
export type TransactionCategory = typeof transactionCategory.$inferSelect;
export type TransactionSubcategory = typeof transactionSubcategory.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type TransactionTypeRow = typeof transactionType.$inferSelect;
