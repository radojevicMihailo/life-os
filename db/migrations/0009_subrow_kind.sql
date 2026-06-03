ALTER TABLE "physical_activity_subrows"
  ADD COLUMN "kind" text NOT NULL DEFAULT 'exercise'
  CONSTRAINT "physical_activity_subrows_kind_check" CHECK ("kind" IN ('exercise', 'split'));
