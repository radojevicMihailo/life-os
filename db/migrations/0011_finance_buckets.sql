CREATE TABLE "finance_buckets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "asset_group_id" uuid REFERENCES "finance_asset_groups"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_bucket_name_idx" ON "finance_buckets" ("name");
--> statement-breakpoint
CREATE INDEX "finance_bucket_group_idx" ON "finance_buckets" ("asset_group_id");
--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "bucket_id" uuid REFERENCES "finance_buckets"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "finance_account_bucket_idx" ON "finance_accounts" ("bucket_id");
