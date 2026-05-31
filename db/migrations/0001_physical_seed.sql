-- Seed Gym and Running modalities with default fields, categories, and sample exercises.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
WITH gym AS (
  INSERT INTO modalities (id, name, sort_order)
  VALUES (gen_random_uuid(), 'Gym', 0)
  RETURNING id
),
running AS (
  INSERT INTO modalities (id, name, sort_order)
  VALUES (gen_random_uuid(), 'Running', 1)
  RETURNING id
),
gym_cats AS (
  INSERT INTO physical_categories (id, modality_id, name, sort_order)
  SELECT gen_random_uuid(), gym.id, n.name, n.idx
  FROM gym, (VALUES ('Push', 0), ('Pull', 1), ('Legs', 2), ('Core', 3)) AS n(name, idx)
  RETURNING id, name, modality_id
),
running_cats AS (
  INSERT INTO physical_categories (id, modality_id, name, sort_order)
  SELECT gen_random_uuid(), running.id, n.name, n.idx
  FROM running, (VALUES ('Easy', 0), ('Tempo', 1), ('Intervals', 2), ('Long', 3)) AS n(name, idx)
  RETURNING id, name, modality_id
),
gym_top_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), gym.id, 'top', 'notes', 'Notes', 'text', false, 0
  FROM gym
  RETURNING id
),
gym_sub_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), gym.id, 'subrow', f.key, f.label, f.kind::physical_field_kind, f.required, f.idx
  FROM gym, (VALUES
    ('sets', 'Sets', 'sets_array', true, 0)
  ) AS f(key, label, kind, required, idx)
  RETURNING id
),
running_top_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), running.id, 'top', f.key, f.label, f.kind::physical_field_kind, f.required, f.idx
  FROM running, (VALUES
    ('category', 'Category', 'category_ref', false, 0),
    ('distance', 'Distance (km)', 'distance_km', true, 1),
    ('duration', 'Duration', 'duration_sec', true, 2),
    ('pace', 'Pace (per km)', 'duration_sec', false, 3)
  ) AS f(key, label, kind, required, idx)
  RETURNING id
),
running_sub_fields AS (
  INSERT INTO physical_fields (id, modality_id, scope, key, label, kind, required, sort_order)
  SELECT gen_random_uuid(), running.id, 'subrow', f.key, f.label, f.kind::physical_field_kind, false, f.idx
  FROM running, (VALUES
    ('distance', 'Distance (km)', 'distance_km', 0),
    ('duration', 'Duration', 'duration_sec', 1),
    ('pace', 'Pace (per km)', 'duration_sec', 2)
  ) AS f(key, label, kind, idx)
  RETURNING id
),
gym_exercises AS (
  INSERT INTO physical_exercises (id, modality_id, category_id, name)
  SELECT gen_random_uuid(), c.modality_id, c.id, e.name
  FROM gym_cats c
  JOIN (VALUES
    ('Push', 'Bench Press'),
    ('Push', 'Overhead Press'),
    ('Pull', 'Deadlift'),
    ('Pull', 'Barbell Row'),
    ('Legs', 'Back Squat'),
    ('Legs', 'Romanian Deadlift'),
    ('Core', 'Plank')
  ) AS e(category, name) ON e.category = c.name
  RETURNING id
)
INSERT INTO physical_exercises (id, modality_id, category_id, name)
SELECT gen_random_uuid(), c.modality_id, c.id, e.name
FROM running_cats c
JOIN (VALUES
  ('Easy', 'Easy Run'),
  ('Tempo', 'Tempo Run'),
  ('Intervals', 'Track Intervals'),
  ('Long', 'Long Run')
) AS e(category, name) ON e.category = c.name;
