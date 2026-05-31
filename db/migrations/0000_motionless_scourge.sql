CREATE TYPE "public"."physical_field_kind" AS ENUM('text', 'number', 'decimal', 'duration_sec', 'distance_km', 'sets_array', 'category_ref', 'exercise_ref');--> statement-breakpoint
CREATE TYPE "public"."physical_field_scope" AS ENUM('top', 'subrow');--> statement-breakpoint
CREATE TABLE "modalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modalities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "physical_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality_id" uuid NOT NULL,
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
CREATE TABLE "physical_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality_id" uuid NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_activity_subrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"exercise_id" uuid,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_plan_subrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"exercise_id" uuid,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "physical_fields" ADD CONSTRAINT "physical_fields_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_categories" ADD CONSTRAINT "physical_categories_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_exercises" ADD CONSTRAINT "physical_exercises_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_exercises" ADD CONSTRAINT "physical_exercises_category_id_physical_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."physical_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activities" ADD CONSTRAINT "physical_activities_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_subrows" ADD CONSTRAINT "physical_activity_subrows_activity_id_physical_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."physical_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_activity_subrows" ADD CONSTRAINT "physical_activity_subrows_exercise_id_physical_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."physical_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_plans" ADD CONSTRAINT "physical_plans_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_plan_subrows" ADD CONSTRAINT "physical_plan_subrows_plan_id_physical_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."physical_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_plan_subrows" ADD CONSTRAINT "physical_plan_subrows_exercise_id_physical_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."physical_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "modality_sort_idx" ON "modalities" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "physical_field_unique_idx" ON "physical_fields" USING btree ("modality_id","scope","key");--> statement-breakpoint
CREATE INDEX "physical_field_modality_idx" ON "physical_fields" USING btree ("modality_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_modality_name_idx" ON "physical_categories" USING btree ("modality_id","name");--> statement-breakpoint
CREATE INDEX "category_modality_idx" ON "physical_categories" USING btree ("modality_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_modality_name_idx" ON "physical_exercises" USING btree ("modality_id","name");--> statement-breakpoint
CREATE INDEX "exercise_modality_idx" ON "physical_exercises" USING btree ("modality_id");--> statement-breakpoint
CREATE INDEX "exercise_category_idx" ON "physical_exercises" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "activity_modality_idx" ON "physical_activities" USING btree ("modality_id");--> statement-breakpoint
CREATE INDEX "activity_performed_at_idx" ON "physical_activities" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "activity_subrow_activity_idx" ON "physical_activity_subrows" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "plan_modality_idx" ON "physical_plans" USING btree ("modality_id");--> statement-breakpoint
CREATE INDEX "plan_subrow_plan_idx" ON "physical_plan_subrows" USING btree ("plan_id");
