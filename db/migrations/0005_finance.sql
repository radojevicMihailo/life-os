CREATE TYPE "public"."finance_transaction_type" AS ENUM ('prihod', 'trosak', 'ulaganje', 'prodaja_investicije', 'rebalans', 'pocetno_stanje');
--> statement-breakpoint
CREATE TYPE "public"."finance_category_kind" AS ENUM ('income', 'expense', 'investment');
--> statement-breakpoint
CREATE TABLE "finance_currencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_currency_code_idx" ON "finance_currencies" ("code");
--> statement-breakpoint
CREATE TABLE "finance_asset_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_asset_group_name_idx" ON "finance_asset_groups" ("name");
--> statement-breakpoint
CREATE TABLE "finance_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "asset_group_id" uuid REFERENCES "finance_asset_groups"("id") ON DELETE SET NULL,
  "currency_id" uuid REFERENCES "finance_currencies"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_account_name_idx" ON "finance_accounts" ("name");
--> statement-breakpoint
CREATE INDEX "finance_account_group_idx" ON "finance_accounts" ("asset_group_id");
--> statement-breakpoint
CREATE INDEX "finance_account_currency_idx" ON "finance_accounts" ("currency_id");
--> statement-breakpoint
CREATE TABLE "finance_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" "finance_category_kind" NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_category_kind_name_idx" ON "finance_categories" ("kind","name");
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurred_on" date NOT NULL,
  "type" "finance_transaction_type" NOT NULL,
  "description" text,
  "category_id" uuid REFERENCES "finance_categories"("id") ON DELETE SET NULL,
  "from_account_id" uuid REFERENCES "finance_accounts"("id") ON DELETE SET NULL,
  "to_account_id" uuid REFERENCES "finance_accounts"("id") ON DELETE SET NULL,
  "outflow_amount" numeric(24,8),
  "outflow_currency_id" uuid REFERENCES "finance_currencies"("id") ON DELETE SET NULL,
  "inflow_amount" numeric(24,8),
  "inflow_currency_id" uuid REFERENCES "finance_currencies"("id") ON DELETE SET NULL,
  "eur_rate" numeric(24,8),
  "eur_amount" numeric(24,8),
  "usd_rate" numeric(24,8),
  "usd_amount" numeric(24,8),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "finance_tx_date_idx" ON "finance_transactions" ("occurred_on");
--> statement-breakpoint
CREATE INDEX "finance_tx_category_idx" ON "finance_transactions" ("category_id");
--> statement-breakpoint
CREATE INDEX "finance_tx_from_idx" ON "finance_transactions" ("from_account_id");
--> statement-breakpoint
CREATE INDEX "finance_tx_to_idx" ON "finance_transactions" ("to_account_id");
