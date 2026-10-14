import "server-only";
import type { Pool, PoolClient } from "pg";

/** Shared by every Alpha client using this database; never stores API credentials. */
export async function reserveAlphaVantageRequest(pool: Pool, minimumIntervalMs = 1100): Promise<boolean> {
  for (;;) {
    let client: PoolClient | undefined;
    let discardClient = false;
    let waitMs = 0;
    let full = false;
    let reserved = false;
    try {
      client = await pool.connect();
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      // Serialize quota decisions across processes. The following statements get
      // fresh READ COMMITTED snapshots after the lock holder has committed.
      await client.query("SELECT pg_advisory_xact_lock(1279872847, 25)");
      await client.query(`DELETE FROM finance_alpha_vantage_request_reservations
        WHERE reserved_at <= clock_timestamp() - interval '24 hours'`);
      const allowance = await client.query(`SELECT count(*)::int AS count,
        ceil(greatest(0, $1::int - extract(epoch FROM (clock_timestamp() - max(reserved_at))) * 1000)) AS wait_ms
        FROM finance_alpha_vantage_request_reservations`, [minimumIntervalMs]);
      full = allowance.rows[0].count >= 25;
      waitMs = Number(allowance.rows[0].wait_ms);
      if (!full && waitMs === 0) {
        await client.query("INSERT INTO finance_alpha_vantage_request_reservations DEFAULT VALUES");
        reserved = true;
      }
      await client.query("COMMIT");
      // No transaction/connection remains open during the caller's HTTP request.
      // Failed HTTP attempts and crashes keep their committed reservations.
    } catch {
      if (client) {
        try { await client.query("ROLLBACK"); } catch { discardClient = true; }
      }
      // Database messages may contain credentials or infrastructure details.
      throw new Error("alpha_vantage_request_budget_unavailable");
    } finally {
      client?.release(discardClient);
    }
    if (full) return false;
    if (reserved) return true;
    // Alpha's free service also limits bursts to one request per second. Wait
    // outside the transaction, then recheck under the shared lock so concurrent
    // clients cannot wake together and send a burst.
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(1, waitMs)));
  }
}
