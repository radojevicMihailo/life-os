-- Retain original classifications for inspection/rollback before mapping to Q1–Q4.
CREATE TABLE priorities_legacy_backup AS SELECT * FROM priorities;
CREATE TABLE task_priorities_legacy_backup AS SELECT id AS task_id, priority_id FROM tasks WHERE priority_id IS NOT NULL;
-- Temporary names avoid collisions with existing custom names.
INSERT INTO priorities(id, name, color, rank) VALUES
 ('e1500000-0000-4000-8000-000000000001','__fixed_q1','#ef4444',1),
 ('e1500000-0000-4000-8000-000000000002','__fixed_q2','#3b82f6',2),
 ('e1500000-0000-4000-8000-000000000003','__fixed_q3','#f59e0b',3),
 ('e1500000-0000-4000-8000-000000000004','__fixed_q4','#64748b',4);
WITH ranked AS (
 SELECT id, name, row_number() OVER (ORDER BY rank, created_at, id) AS position
 FROM priorities_legacy_backup
), mapping AS (
 SELECT id, CASE
  WHEN name ~* '^Q[1-4]([^0-9]|$)' THEN substring(upper(name) from 2 for 1)::integer
  ELSE least(position,4)::integer END AS quadrant FROM ranked
)
UPDATE tasks SET priority_id = ('e1500000-0000-4000-8000-00000000000' || mapping.quadrant)::uuid
FROM mapping WHERE tasks.priority_id = mapping.id;
DELETE FROM priorities WHERE id NOT IN (
 'e1500000-0000-4000-8000-000000000001', 'e1500000-0000-4000-8000-000000000002',
 'e1500000-0000-4000-8000-000000000003', 'e1500000-0000-4000-8000-000000000004');
UPDATE priorities SET name = CASE rank
 WHEN 1 THEN 'Q1 - hitno i bitno'
 WHEN 2 THEN 'Q2 - nije hitno, jeste bitno'
 WHEN 3 THEN 'Q3 - jeste hitno, nije bitno'
 WHEN 4 THEN 'Q4 - nije hitno, nije bitno' END;
ALTER TABLE priorities ADD CONSTRAINT fixed_task_quadrant CHECK (
 (id='e1500000-0000-4000-8000-000000000001' AND rank=1 AND name='Q1 - hitno i bitno') OR
 (id='e1500000-0000-4000-8000-000000000002' AND rank=2 AND name='Q2 - nije hitno, jeste bitno') OR
 (id='e1500000-0000-4000-8000-000000000003' AND rank=3 AND name='Q3 - jeste hitno, nije bitno') OR
 (id='e1500000-0000-4000-8000-000000000004' AND rank=4 AND name='Q4 - nije hitno, nije bitno')
);
