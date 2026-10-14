-- Add to the existing purpose group, preserving its IDs and configuration.
-- Rollback: remove only the newly inserted unused tag and restore the prior
-- modes; existing purpose tags and historical selections must be retained.
DO $$
DECLARE
 purpose_id uuid;
BEGIN
 SELECT id INTO purpose_id FROM activity_tag_groups
 WHERE lower(translate(name, 'čćšžđ', 'ccszd')) IN ('namera', 'namena', 'intent')
 ORDER BY CASE WHEN lower(name) = 'namera' THEN 0 ELSE 1 END, sort_order, id LIMIT 1;

 IF purpose_id IS NULL THEN
  INSERT INTO activity_tag_groups(name, sort_order)
  VALUES ('Namera', (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM activity_tag_groups))
  RETURNING id INTO purpose_id;
 END IF;

 INSERT INTO activity_tags(group_id, name, sort_order)
 SELECT purpose_id, 'Kardio', COALESCE(MAX(sort_order), -1) + 1
 FROM activity_tags WHERE group_id = purpose_id
 HAVING NOT EXISTS (
  SELECT 1 FROM activity_tags WHERE group_id = purpose_id AND lower(name) IN ('kardio', 'cardio')
 )
 ON CONFLICT(group_id, name) DO NOTHING;

 -- Unrestricted groups already appear for cardio. Extend only explicit modes.
 UPDATE activity_tag_groups
 SET placement = jsonb_set(placement, '{modes}', (placement->'modes') || '["cardio"]'::jsonb)
 WHERE id = purpose_id AND placement->>'scope' = 'session'
  AND jsonb_typeof(placement->'modes') = 'array'
  AND placement->'modes' <> '[]'::jsonb
  AND NOT (placement->'modes' @> '["cardio"]'::jsonb);
END $$;
