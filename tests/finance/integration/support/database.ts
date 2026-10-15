import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
} from "testcontainers";

import * as schema from "@/modules/finance/db/schema";

export const TEST_DATABASE_HOOK_TIMEOUT_MS = 120_000;
export const TEST_DATABASE_TEARDOWN_TIMEOUT_MS = 30_000;

export interface TestDatabase {
  connectionString: string;
  container?: StartedTestContainer;
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: Pool;
  close(): Promise<void>;
}

async function waitForDatabase(pool: Pool): Promise<void> {
  const timeoutMs = 30_000;
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Timed out waiting ${timeoutMs}ms for PostgreSQL readiness`);
}

export async function createTestDatabase(): Promise<TestDatabase> {
  // Explicit opt-in for an isolated local PostgreSQL server when Docker is unavailable.
  // Every suite gets its own disposable database; never use an application database.
  if (process.env.FINANCE_TEST_POSTGRES_URL) {
    const adminUrl = new URL(process.env.FINANCE_TEST_POSTGRES_URL);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(adminUrl.hostname)) throw new Error("Test PostgreSQL must be local");
    const name = `finance_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({connectionString: adminUrl.toString(),max:1});
    await admin.query(`CREATE DATABASE "${name}"`);
    const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${name}`;
    const connectionString=databaseUrl.toString();
    const pool=new Pool({connectionString,max:5,connectionTimeoutMillis:5000,options:"-c timezone=UTC"});
    return {connectionString,pool,db:drizzle(pool,{schema}),close:async()=>{
      await pool.end();
      try {
        // pool.end() may resolve just before the server observes its final socket close.
        // Wait for that close instead of forcibly terminating a closing pg client.
        for(let attempt=0;;attempt++) {
          try {await admin.query(`DROP DATABASE "${name}"`);break;}
          catch(error) {
            if((error as {code?:string}).code!=="55006" || attempt>=50)throw error;
            await delay(100);
          }
        }
      } finally {await admin.end();}
    }};
  }

  const database = "finance_tracker_test";
  const username = "postgres";
  const password = "postgres";

  const container = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_DB: database,
      POSTGRES_PASSWORD: password,
      POSTGRES_USER: username,
    })
    .withExposedPorts(5432)
    .start();

  const connectionString = `postgres://${username}:${password}@${container.getHost()}:${container.getMappedPort(5432)}/${database}`;
  const pool = new Pool({
    application_name: `finance-tracker-tests-${randomUUID()}`,
    connectionString,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
    statement_timeout: 5_000,
  });

  try {
    await waitForDatabase(pool);
  } catch (error) {
    await pool.end();
    await container.stop();
    throw error;
  }

  return {
    connectionString,
    container,
    db: drizzle(pool, { schema }),
    pool,
    async close() {
      await pool.end();
      await container.stop();
    },
  };
}
