import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';

export async function migrate(pool, directory = fileURLToPath(new URL('../db/unified-migrations/', import.meta.url))) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(91724001)');
    const known = await client.query("SELECT to_regclass('public.life_os_migrations') AS journal");
    if (!known.rows[0].journal) {
      const existing = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
      if (existing.rowCount) throw new Error('Fresh database required: refusing to initialize an existing database.');
    }
    await client.query('CREATE TABLE IF NOT EXISTS life_os_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of (await readdir(directory)).filter(n => /^\d+.*\.sql$/.test(n)).sort()) {
      const sql = await readFile(resolve(directory, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const applied = await client.query('SELECT checksum FROM life_os_migrations WHERE name=$1', [name]);
      if (applied.rowCount) {
        if (applied.rows[0].checksum !== checksum) throw new Error(`Migration changed after applying: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql.replace(/-->\s*statement-breakpoint/g, ''));
        await client.query('INSERT INTO life_os_migrations(name, checksum) VALUES($1,$2)', [name, checksum]);
        await client.query('COMMIT');
        console.log(`Applied ${name}`);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally { await client.query('SELECT pg_advisory_unlock(91724001)').catch(() => {}); client.release(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try { await migrate(pool); } finally { await pool.end(); }
}
