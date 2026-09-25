import { Pool } from "pg";
const cache = globalThis as typeof globalThis & { lifeOsPool?: Pool };
export const pool = cache.lifeOsPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX_CONNECTIONS ?? 3),
  connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
  statement_timeout: 15000, query_timeout: 15000,
});
if (process.env.NODE_ENV !== "production") cache.lifeOsPool = pool;
