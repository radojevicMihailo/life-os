import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
export async function migrateDatabase(database: { execute: (query: ReturnType<typeof sql.raw>) => Promise<unknown>; $client?: { query: (query: string) => Promise<unknown> } }) {
 const text = await readFile(new URL('../../db/unified-migrations/0001_finance.sql', import.meta.url), 'utf8');
 if (database.$client) await database.$client.query(text); else await database.execute(sql.raw(text));
}
