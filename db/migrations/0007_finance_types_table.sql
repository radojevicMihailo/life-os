CREATE TABLE "finance_transaction_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "color" text NOT NULL DEFAULT 'gray',
  "category_kind" "finance_category_kind",
  "shows_from" boolean NOT NULL DEFAULT true,
  "shows_to" boolean NOT NULL DEFAULT true,
  "shows_outflow" boolean NOT NULL DEFAULT true,
  "shows_inflow" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_transaction_type_key_idx" ON "finance_transaction_types" ("key");
--> statement-breakpoint

INSERT INTO "finance_transaction_types"
  ("key","label","color","category_kind","shows_from","shows_to","shows_outflow","shows_inflow","sort_order")
VALUES
  ('prihod','Prihod','green','income',false,true,false,true,0),
  ('trosak','Trošak','red','expense',true,false,true,false,1),
  ('ulaganje','Ulaganje','yellow','investment',true,true,true,true,2),
  ('prodaja_investicije','Prodaja investicije','green','investment',true,true,true,true,3),
  ('rebalans','Rebalans','blue',NULL,true,true,true,true,4),
  ('pocetno_stanje','Početno stanje','gray',NULL,false,true,false,true,5)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "finance_transactions" ALTER COLUMN "type" TYPE text USING "type"::text;
--> statement-breakpoint
DROP TYPE "finance_transaction_type";
