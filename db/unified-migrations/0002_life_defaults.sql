INSERT INTO app_settings(id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO physical_fields(scope,key,label,kind,required,sort_order) VALUES
 ('subrow','sets','Sets','sets_array',false,0),
 ('subrow','distance','Distance (km)','distance_km',false,1),
 ('subrow','duration','Duration','duration_sec',false,2),
 ('subrow','pace','Pace (per km)','duration_sec',false,3),
 ('subrow','sprintDistance','Distance (m)','number',false,4),
 ('subrow','sprintReps','Reps','number',false,5)
 ON CONFLICT(scope,key) DO NOTHING;
ALTER TABLE physical_activity_subrows ADD CONSTRAINT physical_activity_subrows_kind_check CHECK (kind IN ('exercise','split','sprint'));
