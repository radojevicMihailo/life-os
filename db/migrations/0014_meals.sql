CREATE TYPE "food_source" AS ENUM ('manual', 'off');
--> statement-breakpoint
CREATE TABLE "food_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "brand" text,
  "kcal_per_100g" numeric(8,2) NOT NULL,
  "protein_per_100g" numeric(7,2) NOT NULL DEFAULT 0,
  "carbs_per_100g" numeric(7,2) NOT NULL DEFAULT 0,
  "fat_per_100g" numeric(7,2) NOT NULL DEFAULT 0,
  "source" "food_source" NOT NULL DEFAULT 'manual',
  "off_id" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "food_item_archived_idx" ON "food_items" ("archived_at");
--> statement-breakpoint
CREATE INDEX "food_item_name_idx" ON "food_items" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "food_item_off_id_uq" ON "food_items" ("off_id") WHERE "off_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "meals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "name" text NOT NULL,
  "eaten_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "meal_date_idx" ON "meals" ("date");
--> statement-breakpoint
CREATE TABLE "meal_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meal_id" uuid NOT NULL REFERENCES "meals"("id") ON DELETE CASCADE,
  "food_id" uuid REFERENCES "food_items"("id") ON DELETE SET NULL,
  "food_name_snapshot" text NOT NULL,
  "kcal_per_100g_snapshot" numeric(8,2) NOT NULL,
  "protein_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "carbs_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "fat_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "grams" numeric(8,2) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "meal_item_meal_idx" ON "meal_items" ("meal_id");
--> statement-breakpoint
CREATE TABLE "meal_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_template_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "meal_templates"("id") ON DELETE CASCADE,
  "food_id" uuid REFERENCES "food_items"("id") ON DELETE SET NULL,
  "food_name_snapshot" text NOT NULL,
  "kcal_per_100g_snapshot" numeric(8,2) NOT NULL,
  "protein_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "carbs_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "fat_snapshot" numeric(7,2) NOT NULL DEFAULT 0,
  "grams" numeric(8,2) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "meal_template_item_template_idx" ON "meal_template_items" ("template_id");
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "meal_daily_kcal_target" integer;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "meal_daily_protein_g_target" integer;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "meal_daily_carbs_g_target" integer;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "meal_daily_fat_g_target" integer;
