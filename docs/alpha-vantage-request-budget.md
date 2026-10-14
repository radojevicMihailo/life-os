# Alpha Vantage request allowance

Every production Alpha Vantage symbol search and quote request reserves one of
25 slots in PostgreSQL before sending HTTP. Reservations expire individually
after 24 hours, using database time. Startup, cron, workers, and manual instrument
resolution share this allowance across processes and redeploys. HTTP failures
and crashes retain their reservations. A database failure prevents HTTP.
The short reservation transaction commits before any network request.

Migration `0015_alpha_vantage_request_budget.sql` conservatively creates 25
reservations if an Alpha refresh run with a positive attempted count has activity
within the previous 24 hours. These reservations use the latest run's finish time
(or start time if unfinished), so the initial pause ends 24 hours after that
activity. Fresh installations and installations with only older runs start with
an available allowance.

Earlier versions did not store individual request timestamps. The migration
cannot reconstruct unrecorded manual requests or incomplete refresh activity
without a positive attempted count. The exact durable accounting guarantee
therefore applies to requests made by the updated production clients; the
initial conservative pause covers known recent refresh activity.

Inspect the remaining allowance without exposing API credentials:

```sql
SELECT greatest(0, 25 - count(*))::integer AS remaining_requests,
       min(reserved_at) + interval '24 hours' AS first_reservation_expires_at
FROM finance_alpha_vantage_request_reservations
WHERE reserved_at > clock_timestamp() - interval '24 hours';
```
