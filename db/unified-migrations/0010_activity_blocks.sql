ALTER TABLE physical_activities ADD COLUMN title text;
ALTER TABLE physical_activity_subrows ADD COLUMN details jsonb;
ALTER TABLE activity_tag_groups ADD COLUMN placement jsonb;
ALTER TABLE physical_workout_plans ADD COLUMN blocks jsonb;
CREATE TABLE physical_activity_subrow_tags (
 subrow_id uuid NOT NULL REFERENCES physical_activity_subrows(id) ON DELETE CASCADE,
 tag_id uuid NOT NULL REFERENCES activity_tags(id) ON DELETE CASCADE,
 PRIMARY KEY (subrow_id,tag_id)
);
CREATE INDEX physical_activity_subrow_tags_tag_idx ON physical_activity_subrow_tags(tag_id);
INSERT INTO physical_fields(scope,key,label,kind,required,sort_order) VALUES
 ('subrow','sprintDuration','Trajanje sprinta (s)','duration_sec',false,6),
 ('subrow','sprintRest','Pauza (s)','duration_sec',false,7)
ON CONFLICT(scope,key) DO NOTHING;
