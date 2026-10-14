import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { AlphaVantageClient } from "@/modules/finance/adapters/alpha-vantage/client";
import { reserveAlphaVantageRequest } from "@/modules/finance/db/alpha-vantage-budget";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";

describe("durable Alpha Vantage rolling daily allowance", () => {
  let testDb: TestDatabase;
  let server: Server | undefined;
  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);
  beforeEach(async () => {
    await testDb.pool.query("truncate finance_alpha_vantage_request_reservations, finance_provider_refresh_runs");
  });
  afterAll(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    server = undefined;
  });

  it("allows only 25 concurrent symbol-search/quote HTTP attempts across independent pools, including failed requests", async () => {
    const otherPool = new Pool({
      connectionString: testDb.connectionString, max: 5,
      options: "-c default_transaction_isolation=serializable",
    });
    let outgoing = 0;
    server = createServer((_request, response) => {
      outgoing += 1;
      response.writeHead(429).end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test_http_server_address_missing");
    const apiUrl = `http://127.0.0.1:${address.port}/query`;
    const makeClient = (pool: Pool) => new AlphaVantageClient({
      apiKey: "not-a-secret", apiUrl, clock: { now: () => new Date() },
      signal: new AbortController().signal,
      reserveRequest: () => reserveAlphaVantageRequest(pool),
      fetch: async (input, init) => {
        // The reservation is committed and its transaction released before HTTP.
        const stored = await pool.query("select count(*)::int as count from finance_alpha_vantage_request_reservations");
        expect(stored.rows[0].count).toBeGreaterThan(0);
        return fetch(input, init);
      },
    });
    try {
      const clients = [makeClient(testDb.pool), makeClient(otherPool)];
      await Promise.all(Array.from({ length: 60 }, async (_, i) => {
        const client = clients[i % 2];
        if (i % 3 === 0) {
          await expect(client.resolveSymbol({ instrumentId: "test", symbol: "TEST", quoteCurrencyCode: "USD", isin: null, exchange: null })).rejects.toThrow();
        } else {
          await client.fetchQuotes([{ instrumentId: "test", providerId: "TEST", quoteCurrencyCode: "USD" }]);
        }
      }));
      expect(outgoing).toBe(25);
      expect((await testDb.pool.query("select count(*)::int as count from finance_alpha_vantage_request_reservations")).rows).toEqual([{ count: 25 }]);
    } finally { await otherPool.end(); }

    // A fresh pool/client models a worker restart or redeploy with no shared memory.
    const restartedPool = new Pool({ connectionString: testDb.connectionString });
    try {
      const result = await makeClient(restartedPool).fetchQuotes([{ instrumentId: "test", providerId: "TEST", quoteCurrencyCode: "USD" }]);
      expect(result.skippedProviderIds).toEqual(["TEST"]);
      expect(outgoing).toBe(25);
    } finally { await restartedPool.end(); }
  });

  it("expires requests individually after 24 hours, without a midnight reset", async () => {
    await testDb.pool.query(`insert into finance_alpha_vantage_request_reservations (reserved_at)
      select clock_timestamp() - interval '23 hours' from generate_series(1, 24)`);
    await testDb.pool.query(`insert into finance_alpha_vantage_request_reservations (reserved_at)
      values (clock_timestamp() - interval '25 hours')`);
    expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(true);
    expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(false);
    await testDb.pool.query(`update finance_alpha_vantage_request_reservations
      set reserved_at = clock_timestamp() - interval '25 hours'
      where id = (select min(id) from finance_alpha_vantage_request_reservations)`);
    expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(true);
    expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(false);
  });

  it("fails closed on database failure without disclosing database errors", async () => {
    const closedPool = new Pool({ connectionString: testDb.connectionString });
    await closedPool.end();
    await expect(reserveAlphaVantageRequest(closedPool)).rejects.toThrow("alpha_vantage_request_budget_unavailable");
  });

  it.each([
    { name: "no Alpha history", ageHours: null, attempted: 0, reserved: 0 },
    { name: "old Alpha history", ageHours: 25, attempted: 1, reserved: 0 },
    { name: "recent Alpha history", ageHours: 2, attempted: 1, reserved: 25 },
    { name: "recent zero-attempt run", ageHours: 2, attempted: 0, reserved: 0 },
  ])("migration conservatively initializes allowance for $name", async ({ ageHours, attempted, reserved }) => {
    await testDb.pool.query(`insert into finance_provider_refresh_runs
      (id, provider, started_at, finished_at, status, attempted_count)
      values ('other-provider', 'coingecko', clock_timestamp(), clock_timestamp(), 'failed', 25)`);
    if (ageHours !== null) {
      await testDb.pool.query(`insert into finance_provider_refresh_runs
        (id, provider, started_at, finished_at, status, attempted_count)
        values ('alpha-history', 'alpha_vantage', clock_timestamp() - ($1 + 1) * interval '1 hour',
          clock_timestamp() - $1 * interval '1 hour', 'failed', $2)`, [ageHours, attempted]);
    }
    await testDb.pool.query("drop table finance_alpha_vantage_request_reservations");
    const migration = await readFile(new URL("../../../../db/unified-migrations/0015_alpha_vantage_request_budget.sql", import.meta.url), "utf8");
    await testDb.pool.query(migration);
    expect((await testDb.pool.query("select count(*)::int as count from finance_alpha_vantage_request_reservations")).rows).toEqual([{ count: reserved }]);
    if (reserved > 0) {
      expect((await testDb.pool.query(`select count(*)::int as count
        from finance_alpha_vantage_request_reservations r
        join finance_provider_refresh_runs run on r.reserved_at = run.finished_at
        where run.id = 'alpha-history'`)).rows).toEqual([{ count: 25 }]);
      expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(false);
    } else {
      expect(await reserveAlphaVantageRequest(testDb.pool)).toBe(true);
    }
  });
});
