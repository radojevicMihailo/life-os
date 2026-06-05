DROP TABLE IF EXISTS "physical_plan_tags";
--> statement-breakpoint
DROP TABLE IF EXISTS "physical_plan_subrows";
--> statement-breakpoint
DROP TABLE IF EXISTS "physical_plans";
--> statement-breakpoint
CREATE TABLE "physical_workout_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "notes" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_workout_plan_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL REFERENCES "physical_workout_plans"("id") ON DELETE CASCADE,
  "exercise_id" uuid NOT NULL REFERENCES "physical_exercises"("id") ON DELETE RESTRICT,
  "set_count" integer NOT NULL DEFAULT 1,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "workout_plan_exercise_plan_idx" ON "physical_workout_plan_exercises" ("plan_id");
--> statement-breakpoint
CREATE TABLE "physical_splits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "notes" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_split_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "split_id" uuid NOT NULL REFERENCES "physical_splits"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "tag_id" uuid REFERENCES "activity_tags"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "split_day_split_idx" ON "physical_split_days" ("split_id");
