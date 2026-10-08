ALTER TABLE physical_activity_subrows DROP CONSTRAINT IF EXISTS physical_activity_subrows_kind_check;
ALTER TABLE physical_activity_subrows ADD CONSTRAINT physical_activity_subrows_kind_check CHECK (kind IN ('exercise','split','sprint','interval'));
