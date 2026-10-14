# Alpha Vantage request allowance

Every production Alpha Vantage symbol search and quote request reserves one of
25 slots in PostgreSQL before sending HTTP. Reservations expire individually
after 24 hours, using database time. Startup, cron, workers, and manual instrument
resolution share this allowance across processes and redeploys. HTTP failures
and crashes retain their reservations. A database failure prevents HTTP.
The short reservation transaction commits before any network request. Requests
also share a minimum 1.1-second interval across processes, because the free
service rejects bursts above one request per second. A caller waits outside the
transaction and then rechecks the interval under the shared database lock.

Migration `0015_alpha_vantage_request_budget.sql` initially created 25 synthetic
reservations from recent refresh history. That blocked usable quotes even when
the provider still had allowance. Migration `0016_remove_synthetic_alpha_budget.sql`
removes only the identifiable seed batch (IDs 1–25 with the same timestamp
matching a historical Alpha refresh), preserving all recorded real requests.

Earlier versions did not store individual request timestamps. The migration
cannot reconstruct unrecorded manual requests or incomplete refresh activity
without a positive attempted count. The exact durable accounting guarantee
therefore applies to requests made by the updated production clients. The
provider can still reject a request if older, untracked calls consumed its own
allowance; synthetic reservations are not treated as evidence of such usage.

Inspect the remaining allowance without exposing API credentials:

```sql
SELECT greatest(0, 25 - count(*))::integer AS remaining_requests,
       min(reserved_at) + interval '24 hours' AS first_reservation_expires_at
FROM finance_alpha_vantage_request_reservations
WHERE reserved_at > clock_timestamp() - interval '24 hours';
```
