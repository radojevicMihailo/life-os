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
  container: StartedTestContainer;
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
