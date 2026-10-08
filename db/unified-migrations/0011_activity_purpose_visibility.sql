-- Resolve the user's existing named configuration once, then persist ID-based rules.
-- Renaming groups/options afterwards does not change the dependency.
WITH purpose AS (
 SELECT id FROM activity_tag_groups
 WHERE lower(translate(name, 'čćšžđ', 'ccszd')) IN ('namera', 'namena', 'intent')
 ORDER BY CASE WHEN lower(name) = 'namera' THEN 0 ELSE 1 END, sort_order, id LIMIT 1
), rules AS (
 SELECT g.id AS group_id, p.id AS purpose_id,
   jsonb_agg(t.id ORDER BY t.sort_order, t.id) AS tag_ids
 FROM activity_tag_groups g CROSS JOIN purpose p
 JOIN activity_tags t ON t.group_id = p.id
 WHERE
   (lower(g.name) = 'region' AND lower(translate(t.name, 'čćšžđ', 'ccszd')) IN ('snaga', 'eksplozivnost', 'hipertrofija', 'emom')) OR
   (lower(translate(g.name, 'čćšžđ', 'ccszd')) IN ('vrsta trcanja', 'vrsta trcanje') AND lower(translate(t.name, 'čćšžđ', 'ccszd')) = 'trcanje') OR
   (lower(g.name) = 'vrsta aktivnog odmora' AND lower(t.name) = 'aktivni odmor') OR
   (lower(g.name) = 'sport' AND lower(t.name) = 'sport')
 GROUP BY g.id, p.id
)
UPDATE activity_tag_groups g
SET placement = COALESCE(g.placement, '{"scope":"session","modes":[],"kinds":[]}'::jsonb)
  || jsonb_build_object('when', jsonb_build_object('groupId', r.purpose_id, 'tagIds', r.tag_ids))
FROM rules r WHERE g.id = r.group_id AND g.placement->'when' IS NULL;
