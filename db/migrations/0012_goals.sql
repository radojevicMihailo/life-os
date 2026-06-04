CREATE TYPE "goal_status" AS ENUM ('active', 'done', 'paused', 'canceled');
--> statement-breakpoint
CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" "goal_status" DEFAULT 'active' NOT NULL,
  "target_date" timestamp with time zone,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "goal_status_idx" ON "goals" ("status");
--> statement-breakpoint
CREATE TABLE "milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "due_date" timestamp with time zone,
  "done_at" timestamp with time zone,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "milestone_goal_id_idx" ON "milestones" ("goal_id");
