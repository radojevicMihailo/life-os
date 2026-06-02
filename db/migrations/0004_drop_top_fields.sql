-- Drop unwanted top-scope fields. Distance/duration/pace live in subrows now; notes superseded by activity.comment.
DELETE FROM "physical_fields"
WHERE "scope" = 'top'
  AND "key" IN ('notes', 'distance', 'duration', 'pace', 'category');
