import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../scripts/migrate.mjs";
import { PgPushStore } from "../../lib/notifications/store";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for disposable database test");
  const admin = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const name = `lifeos_push_test_${randomBytes(6).toString("hex")}`;
  let pool: Pool | undefined;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = `/${name}`;
    pool = new Pool({ connectionString: url.toString(), max: 3 });
    await migrate(pool);
    await migrate(pool);
    const store = new PgPushStore(pool);
    const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "test-key", auth: "test-auth" } });
    await store.upsertDevice(sub("https://web.push.apple.com/mac"), "public");
    await store.upsertDevice(sub("https://web.push.apple.com/phone"), "public");
    await store.upsertDevice(sub("https://web.push.apple.com/phone"), "public");
    const devices = await store.listDevices("public");
    assert.equal(devices.length, 2);
    assert.equal((await store.listDevices("another-key")).length, 0);
    const reminder = { key: "task:a", title: "Call", startsAt: new Date(Date.now() + 600000), type: "task" as const, url: "/tasks/a" };
    const results = await Promise.all([store.claim(devices[0].id, reminder, 30), store.claim(devices[0].id, reminder, 30)]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await store.retryLead(devices[0].id, reminder), null);
    await pool.query("UPDATE push_deliveries SET claimed_at=now()-interval '31 seconds'");
    assert.equal(await store.retryLead(devices[0].id, reminder), 30);
    assert.equal(await store.claim(devices[0].id, reminder, 30), true);
    await store.complete(devices[0].id, reminder, 30);
    await pool.query("UPDATE push_deliveries SET claimed_at=now()-interval '31 seconds'");
    assert.equal(await store.claim(devices[0].id, reminder, 30), false);
    assert.equal(await store.retryLead(devices[0].id, reminder), null);
    assert.equal(await store.claim(devices[1].id, reminder, 30), true);
    await store.release(devices[1].id, reminder, 30);
    assert.equal(await store.claim(devices[1].id, reminder, 30), true);
    await store.removeEndpoint(devices[0].endpoint);
    const ledger = await pool.query("SELECT * FROM push_deliveries");
    assert.equal(ledger.rows.length, 1);
    await store.removeDevice(devices[1].id);
    assert.equal((await pool.query("SELECT * FROM push_deliveries")).rows.length, 0);
    console.log("Push database smoke passed: retry-safe migrations, registration, independent-device claims, lease recovery, retries and cascading cleanup.");
  } finally {
    await pool?.end();
    if (created) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Database smoke failed"); process.exitCode = 1; });
