-- Drop activity_types concept entirely; replace with tag-groups + tags.
-- Each activity/plan can be tagged with any number of tags across any number of groups.

-- Drop activity_type FK columns
DROP INDEX IF EXISTS "physical_field_unique_idx";
DROP INDEX IF EXISTS "physical_field_activity_type_idx";
DROP INDEX IF EXISTS "activity_activity_type_idx";
DROP INDEX IF EXISTS "plan_activity_type_idx";
--> statement-breakpoint

ALTER TABLE "physical_fields" DROP COLUMN "activity_type_id" CASCADE;
ALTER TABLE "physical_activities" DROP COLUMN "activity_type_id" CASCADE;
ALTER TABLE "physical_plans" DROP COLUMN "activity_type_id" CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX "physical_field_scope_key_idx" ON "physical_fields" ("scope", "key");
--> statement-breakpoint

DROP TABLE "activity_types";
--> statement-breakpoint

CREATE TABLE "activity_tag_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "activity_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" uuid NOT NULL REFERENCES "activity_tag_groups"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("group_id", "name")
);
CREATE INDEX "activity_tag_group_idx" ON "activity_tags" ("group_id");
--> statement-breakpoint

CREATE TABLE "physical_activity_tags" (
  "activity_id" uuid NOT NULL REFERENCES "physical_activities"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "activity_tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("activity_id", "tag_id")
);
CREATE INDEX "physical_activity_tag_tag_idx" ON "physical_activity_tags" ("tag_id");
--> statement-breakpoint

CREATE TABLE "physical_plan_tags" (
  "plan_id" uuid NOT NULL REFERENCES "physical_plans"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "activity_tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("plan_id", "tag_id")
);
CREATE INDEX "physical_plan_tag_tag_idx" ON "physical_plan_tags" ("tag_id");
