-- 0015 seeded exactly the first 25 IDs at a historical refresh timestamp.
-- Those entries do not represent HTTP requests. Remove only that identifiable
-- seed batch; retain every request recorded by the durable request guard.
WITH bootstrap AS (
  SELECT min(reserved_at) AS at
  FROM finance_alpha_vantage_request_reservations
  WHERE id BETWEEN 1 AND 25
  HAVING count(*) = 25 AND min(reserved_at) = max(reserved_at)
)
DELETE FROM finance_alpha_vantage_request_reservations reservation
USING bootstrap
WHERE reservation.id BETWEEN 1 AND 25
  AND reservation.reserved_at = bootstrap.at
  AND EXISTS (
    SELECT 1 FROM finance_provider_refresh_runs run
    WHERE run.provider = 'alpha_vantage' AND run.attempted_count > 0
      AND coalesce(run.finished_at, run.started_at) = bootstrap.at
  );
