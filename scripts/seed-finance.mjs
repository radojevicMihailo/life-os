import { readFile } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const data = JSON.parse(await readFile(new URL('../db/finance-seed.json', import.meta.url), 'utf8'));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const [table, rows] of Object.entries(data)) {
    for (const row of rows) {
      const keys = Object.keys(row);
      const columns = keys.map(k => '"' + k.replace(/[A-Z]/g, c => '_' + c.toLowerCase()) + '"');
      await client.query(`INSERT INTO "${table}" (${columns.join(',')}) VALUES (${keys.map((_,i) => '$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`, keys.map(k => row[k]));
    }
  }
  await client.query('COMMIT');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
