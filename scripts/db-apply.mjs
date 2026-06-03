#!/usr/bin/env node
// Apply SQL migrations in db/migrations/*.sql, tracking applied files in
// public._applied_migrations. Idempotent: skips already-applied files.
//
// Bootstrap: pre-seeds files known to have been applied manually so the first
// run does not re-execute them.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

const PRE_APPLIED = new Set([
  "0000_motionless_scourge.sql",
  "0001_physical_seed.sql",
  "0001_rename_tables_plural.sql",
  "0002_modality_to_type_and_groups.sql",
  "0003_tag_groups.sql",
  "0004_drop_top_fields.sql",
  "0005_finance.sql",
  "0006_finance_seed.sql",
  "0007_finance_types_table.sql",
]);

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/lifeos";
  const pool = new Pool({ connectionString });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _applied_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows: existing } = await pool.query("SELECT filename FROM _applied_migrations");
  const tracked = new Set(existing.map((r) => r.filename));

  if (tracked.size === 0) {
    for (const f of PRE_APPLIED) {
      await pool.query(
        "INSERT INTO _applied_migrations(filename) VALUES($1) ON CONFLICT DO NOTHING",
        [f],
      );
      tracked.add(f);
    }
    console.log(`bootstrap: marked ${PRE_APPLIED.size} file(s) as already applied`);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (tracked.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const raw = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const cleaned = raw.replace(/-->\s*statement-breakpoint/g, "");
    console.log(`apply  ${file}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(cleaned);
      await client.query(
        "INSERT INTO _applied_migrations(filename) VALUES($1) ON CONFLICT DO NOTHING",
        [file],
      );
      await client.query("COMMIT");
      applied++;
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`FAILED ${file}:`, e.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log(`done. ${applied} migration(s) applied, ${files.length - applied} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
