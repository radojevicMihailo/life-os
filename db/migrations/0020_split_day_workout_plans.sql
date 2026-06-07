CREATE TABLE "physical_split_day_workout_plans" (
  "day_id" uuid NOT NULL REFERENCES "physical_split_days"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "physical_workout_plans"("id") ON DELETE CASCADE,
  PRIMARY KEY ("day_id", "plan_id")
);
--> statement-breakpoint
CREATE INDEX "split_day_workout_plan_plan_idx" ON "physical_split_day_workout_plans" ("plan_id");
