CREATE TYPE "habit_kind" AS ENUM ('binary', 'count');
--> statement-breakpoint
CREATE TYPE "habit_cadence" AS ENUM ('daily', 'weekly_target', 'weekdays');
--> statement-breakpoint
CREATE TABLE "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "kind" "habit_kind" NOT NULL DEFAULT 'binary',
  "target_count" integer NOT NULL DEFAULT 1,
  "unit" text,
  "cadence" "habit_cadence" NOT NULL DEFAULT 'daily',
  "weekly_target" integer NOT NULL DEFAULT 0,
  "weekdays" integer NOT NULL DEFAULT 127,
  "start_date" date NOT NULL DEFAULT CURRENT_DATE,
  "end_date" date,
  "archived_at" timestamp with time zone,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "habit_archived_idx" ON "habits" ("archived_at");
--> statement-breakpoint
CREATE TABLE "habit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "habit_id" uuid NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "count" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "habit_log_unique" UNIQUE ("habit_id", "date")
);
--> statement-breakpoint
CREATE INDEX "habit_log_habit_date_idx" ON "habit_logs" ("habit_id", "date");
