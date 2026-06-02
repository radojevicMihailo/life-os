-- Rename modalities → activity_types and decouple exercises/groups from type.
-- Postgres ALTER preserves data, FKs, and most constraints.

-- modalities → activity_types
ALTER TABLE "modalities" RENAME TO "activity_types";
ALTER INDEX "modality_sort_idx" RENAME TO "activity_type_sort_idx";
--> statement-breakpoint

-- physical_fields.modality_id → activity_type_id
ALTER TABLE "physical_fields" RENAME COLUMN "modality_id" TO "activity_type_id";
ALTER INDEX "physical_field_modality_idx" RENAME TO "physical_field_activity_type_idx";
--> statement-breakpoint

-- physical_activities.modality_id → activity_type_id
ALTER TABLE "physical_activities" RENAME COLUMN "modality_id" TO "activity_type_id";
ALTER INDEX "activity_modality_idx" RENAME TO "activity_activity_type_idx";
--> statement-breakpoint

-- physical_plans.modality_id → activity_type_id
ALTER TABLE "physical_plans" RENAME COLUMN "modality_id" TO "activity_type_id";
ALTER INDEX "plan_modality_idx" RENAME TO "plan_activity_type_idx";
--> statement-breakpoint

-- physical_categories → exercise_groups (global, no type link)
ALTER TABLE "physical_categories" RENAME TO "exercise_groups";
DROP INDEX IF EXISTS "category_modality_name_idx";
DROP INDEX IF EXISTS "category_modality_idx";
ALTER TABLE "exercise_groups" DROP COLUMN "modality_id" CASCADE;
CREATE UNIQUE INDEX "exercise_group_name_idx" ON "exercise_groups" ("name");
--> statement-breakpoint

-- physical_exercises: drop modality_id, rename category_id → group_id
DROP INDEX IF EXISTS "exercise_modality_name_idx";
DROP INDEX IF EXISTS "exercise_modality_idx";
ALTER TABLE "physical_exercises" DROP COLUMN "modality_id" CASCADE;
ALTER TABLE "physical_exercises" RENAME COLUMN "category_id" TO "group_id";
ALTER INDEX "exercise_category_idx" RENAME TO "exercise_group_idx";
CREATE UNIQUE INDEX "exercise_name_idx" ON "physical_exercises" ("name");
