import "server-only";
import type { Pool, PoolClient } from "pg";

/** Shared by every Alpha client using this database; never stores API credentials. */
export async function reserveAlphaVantageRequest(pool: Pool): Promise<boolean> {
  let client: PoolClient | undefined;
  let discardClient = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    // Serialize quota decisions across processes. The following statements get
    // fresh READ COMMITTED snapshots after the lock holder has committed.
    await client.query("SELECT pg_advisory_xact_lock(1279872847, 25)");
    await client.query(`DELETE FROM finance_alpha_vantage_request_reservations
      WHERE reserved_at <= clock_timestamp() - interval '24 hours'`);
    const reservation = await client.query(`INSERT INTO finance_alpha_vantage_request_reservations (reserved_at)
      SELECT clock_timestamp()
      WHERE (SELECT count(*) FROM finance_alpha_vantage_request_reservations) < 25
      RETURNING id`);
    await client.query("COMMIT");
    // No transaction/connection remains open during the caller's HTTP request.
    // Failed HTTP attempts and crashes keep their committed reservations.
    return reservation.rowCount === 1;
  } catch {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { discardClient = true; }
    }
    // Database messages may contain credentials or infrastructure details.
    throw new Error("alpha_vantage_request_budget_unavailable");
  } finally {
    client?.release(discardClient);
  }
}
