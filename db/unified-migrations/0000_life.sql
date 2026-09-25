CREATE TYPE "public"."goal_horizon" AS ENUM('yearly', 'monthly', 'weekly', 'daily');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'done', 'paused', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."habit_cadence" AS ENUM('daily', 'weekly_target', 'weekdays');--> statement-breakpoint
CREATE TYPE "public"."habit_kind" AS ENUM('binary', 'count');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('manual', 'off');--> statement-breakpoint
CREATE TYPE "public"."note_kind" AS ENUM('free', 'todo');--> statement-breakpoint
CREATE TYPE "public"."physical_field_kind" AS ENUM('text', 'number', 'decimal', 'duration_sec', 'distance_km', 'sets_array', 'category_ref', 'exercise_ref');--> statement-breakpoint
CREATE TYPE "public"."physical_field_scope" AS ENUM('top', 'subrow');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('backlog', 'in_progress', 'waiting_for', 'canceled', 'done');--> statement-breakpoint
CREATE TYPE "public"."travel_region" AS ENUM('srbija', 'okolne_drzave', 'evropa', 'svet');--> statement-breakpoint
CREATE TYPE "public"."travel_status" AS ENUM('idea', 'planning', 'booked', 'done');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"horizon" "goal_horizon" DEFAULT 'yearly' NOT NULL,
	"target_date" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" timestamp with time zone,
	"done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" "habit_kind" DEFAULT 'binary' NOT NULL,
	"target_count" integer DEFAULT 1 NOT NULL,
	"unit" text,
	"cadence" "habit_cadence" DEFAULT 'daily' NOT NULL,
	"weekly_target" integer DEFAULT 0 NOT NULL,
	"weekdays" integer DEFAULT 127 NOT NULL,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"archived_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_log_unique" UNIQUE("habit_id","date")
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"kcal_per_100g" numeric(8, 2) NOT NULL,
	"protein_per_100g" numeric(7, 2) DEFAULT '0' NOT NULL,
	"carbs_per_100g" numeric(7, 2) DEFAULT '0' NOT NULL,
	"fat_per_100g" numeric(7, 2) DEFAULT '0' NOT NULL,
	"source" "food_source" DEFAULT 'manual' NOT NULL,
	"off_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"eaten_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"food_id" uuid,
	"food_name_snapshot" text NOT NULL,
	"kcal_per_100g_snapshot" numeric(8, 2) NOT NULL,
	"protein_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"carbs_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"fat_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"grams" numeric(8, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"food_id" uuid,
	"food_name_snapshot" text NOT NULL,
	"kcal_per_100g_snapshot" numeric(8, 2) NOT NULL,
	"protein_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"carbs_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"fat_snapshot" numeric(7, 2) DEFAULT '0' NOT NULL,
	"grams" numeric(8, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" "note_kind" DEFAULT 'free' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notif_sent" (
	"task_id" text NOT NULL,
	"action_at" timestamp with time zone NOT NULL,
	"lead" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notif_sent_task_id_action_at_lead_pk" PRIMARY KEY("task_id","action_at","lead")
);
--> statement-breakpoint
CREATE TABLE "physical_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comment" text,
	"strava_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_activity_subrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"kind" text DEFAULT 'exercise' NOT NULL,
	"exercise_id" uuid,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_tag_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_tag_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "physical_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_activity_tags" (
	"activity_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "physical_activity_tags_activity_id_tag_id_pk" PRIMARY KEY("activity_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "physical_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "physical_field_scope" NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"kind" "physical_field_kind" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_split_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_split_day_tags" (
	"day_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "physical_split_day_tags_day_id_tag_id_pk" PRIMARY KEY("day_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "physical_split_day_workout_plans" (
	"day_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	CONSTRAINT "physical_split_day_workout_plans_day_id_plan_id_pk" PRIMARY KEY("day_id","plan_id")
);
--> statement-breakpoint
CREATE TABLE "physical_workout_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_workout_plan_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"set_count" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"link_next" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"google_calendar_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"meal_daily_kcal_target" integer,
	"meal_daily_protein_g_target" integer,
	"meal_daily_carbs_g_target" integer,
	"meal_daily_fat_g_target" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	CONSTRAINT "contexts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"rank" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "priorities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"project_id" uuid,
	"parent_task_id" uuid,
	"status" "task_status" DEFAULT 'backlog' NOT NULL,
	"priority_id" uuid,
	"action_at" timestamp with time zone,
	"action_end_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"recurrence" jsonb,
	"recurrence_parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_contexts" (
	"task_id" uuid NOT NULL,
	"context_id" uuid NOT NULL,
	CONSTRAINT "task_contexts_task_id_context_id_pk" PRIMARY KEY("task_id","context_id")
);
--> statement-breakpoint
CREATE TABLE "travels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"region" "travel_region" DEFAULT 'srbija' NOT NULL,
	"status" "travel_status" DEFAULT 'idea' NOT NULL,
	"start_date" date,
	"end_date" date,
	"people" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_food_items_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."food_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_template_id_meal_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meal_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_food_id_food_items_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."food_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_items" ADD CONSTRAINT "note_items_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_subrows" ADD CONSTRAINT "physical_activity_subrows_activity_id_physical_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."physical_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_subrows" ADD CONSTRAINT "physical_activity_subrows_exercise_id_physical_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."physical_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tags" ADD CONSTRAINT "activity_tags_group_id_activity_tag_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."activity_tag_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_exercises" ADD CONSTRAINT "physical_exercises_group_id_exercise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."exercise_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_tags" ADD CONSTRAINT "physical_activity_tags_activity_id_physical_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."physical_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_tags" ADD CONSTRAINT "physical_activity_tags_tag_id_activity_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."activity_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_split_days" ADD CONSTRAINT "physical_split_days_split_id_physical_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."physical_splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_split_day_tags" ADD CONSTRAINT "physical_split_day_tags_day_id_physical_split_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."physical_split_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_split_day_tags" ADD CONSTRAINT "physical_split_day_tags_tag_id_activity_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."activity_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_split_day_workout_plans" ADD CONSTRAINT "physical_split_day_workout_plans_day_id_physical_split_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."physical_split_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_split_day_workout_plans" ADD CONSTRAINT "physical_split_day_workout_plans_plan_id_physical_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."physical_workout_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_workout_plan_exercises" ADD CONSTRAINT "physical_workout_plan_exercises_plan_id_physical_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."physical_workout_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_workout_plan_exercises" ADD CONSTRAINT "physical_workout_plan_exercises_exercise_id_physical_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."physical_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurrence_parent_id_tasks_id_fk" FOREIGN KEY ("recurrence_parent_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_contexts" ADD CONSTRAINT "task_contexts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_contexts" ADD CONSTRAINT "task_contexts_context_id_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contexts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goal_horizon_idx" ON "goals" USING btree ("horizon");--> statement-breakpoint
CREATE INDEX "milestone_goal_id_idx" ON "milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "habit_archived_idx" ON "habits" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "habit_log_habit_date_idx" ON "habit_logs" USING btree ("habit_id","date");--> statement-breakpoint
CREATE INDEX "food_item_archived_idx" ON "food_items" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "food_item_name_idx" ON "food_items" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "food_item_off_id_uq" ON "food_items" USING btree ("off_id") WHERE "food_items"."off_id" is not null;--> statement-breakpoint
CREATE INDEX "meal_date_idx" ON "meals" USING btree ("date");--> statement-breakpoint
CREATE INDEX "meal_item_meal_idx" ON "meal_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_template_item_template_idx" ON "meal_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "notes_updated_at_idx" ON "notes" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "note_items_note_position_idx" ON "note_items" USING btree ("note_id","position");--> statement-breakpoint
CREATE INDEX "activity_performed_at_idx" ON "physical_activities" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "activity_subrow_activity_idx" ON "physical_activity_subrows" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_tag_group_name_idx" ON "activity_tags" USING btree ("group_id","name");--> statement-breakpoint
CREATE INDEX "activity_tag_group_idx" ON "activity_tags" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_name_idx" ON "physical_exercises" USING btree ("name");--> statement-breakpoint
CREATE INDEX "exercise_group_idx" ON "physical_exercises" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_group_name_idx" ON "exercise_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "physical_activity_tag_tag_idx" ON "physical_activity_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "physical_field_scope_key_idx" ON "physical_fields" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX "split_day_split_idx" ON "physical_split_days" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "split_day_tag_tag_idx" ON "physical_split_day_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "split_day_workout_plan_plan_idx" ON "physical_split_day_workout_plans" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "workout_plan_exercise_plan_idx" ON "physical_workout_plan_exercises" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_due_at_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "task_action_at_idx" ON "tasks" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "task_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_priority_id_idx" ON "tasks" USING btree ("priority_id");--> statement-breakpoint
CREATE INDEX "task_context_context_id_idx" ON "task_contexts" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "travel_status_idx" ON "travels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "travel_start_date_idx" ON "travels" USING btree ("start_date");