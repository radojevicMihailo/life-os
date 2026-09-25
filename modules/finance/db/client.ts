import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "@/db/pool";
import * as schema from "./schema";
export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
