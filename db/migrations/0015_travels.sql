CREATE TYPE "travel_region" AS ENUM ('srbija', 'okolne_drzave', 'evropa', 'svet');
--> statement-breakpoint
CREATE TYPE "travel_status" AS ENUM ('idea', 'planning', 'booked', 'done');
--> statement-breakpoint
CREATE TABLE "travels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "region" "travel_region" NOT NULL DEFAULT 'srbija',
  "status" "travel_status" NOT NULL DEFAULT 'idea',
  "start_date" date,
  "end_date" date,
  "people" text,
  "notes" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "travel_status_idx" ON "travels" ("status");
--> statement-breakpoint
CREATE INDEX "travel_start_date_idx" ON "travels" ("start_date");
