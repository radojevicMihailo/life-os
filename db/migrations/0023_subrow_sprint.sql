-- Allow a third subrow kind 'sprint' and seed its two subrow fields.
ALTER TABLE "physical_activity_subrows"
  DROP CONSTRAINT IF EXISTS "physical_activity_subrows_kind_check";
--> statement-breakpoint
ALTER TABLE "physical_activity_subrows"
  ADD CONSTRAINT "physical_activity_subrows_kind_check"
  CHECK ("kind" IN ('exercise', 'split', 'sprint'));
--> statement-breakpoint
INSERT INTO "physical_fields" (scope, key, label, kind, required, sort_order)
VALUES
  ('subrow', 'sprintDistance', 'Distance (m)', 'number', false, 3),
  ('subrow', 'sprintReps', 'Reps', 'number', false, 4)
ON CONFLICT (scope, key) DO NOTHING;
