import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as tasksSchema from "./schema/tasks";
import * as physicalSchema from "./schema/physical";
import * as financeSchema from "./schema/finance";
import * as settingsSchema from "./schema/settings";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, {
  schema: { ...tasksSchema, ...physicalSchema, ...financeSchema, ...settingsSchema },
});
