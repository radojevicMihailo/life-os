import { migrate } from './migrate.mjs';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL,max:1});
try { await migrate(pool); } finally { await pool.end(); }
