CREATE TABLE finance_alpha_vantage_request_reservations (
  id bigserial PRIMARY KEY,
  reserved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX finance_alpha_vantage_request_reservations_reserved_at_idx
  ON finance_alpha_vantage_request_reservations (reserved_at);

-- Previous versions tracked attempts per refresh, not per request. If there
-- was recent Alpha activity, conservatively use the entire allowance until
-- 24 hours after the latest known activity. Fresh installations stay unblocked.
INSERT INTO finance_alpha_vantage_request_reservations (reserved_at)
SELECT latest_activity.at
FROM (
  SELECT max(coalesce(finished_at, started_at)) AS at
  FROM finance_provider_refresh_runs
  WHERE provider = 'alpha_vantage'
    AND attempted_count > 0
    AND coalesce(finished_at, started_at) > clock_timestamp() - interval '24 hours'
) latest_activity
CROSS JOIN generate_series(1, 25)
WHERE latest_activity.at IS NOT NULL;
