import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readShortcutAccessSetting, readWebAccessSetting, rotateAccessToken } from "@/modules/finance/auth/settings";
import { verifyOpaqueToken } from "@/modules/finance/auth/token";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

describe("access token rotation", () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("stores only a hash and increments the web access version", async () => {
    const pepper = "test-pepper";
    await rotateAccessToken(testDb.db, {
      kind: "web_access_token",
      rawToken: "first-raw-token",
      pepper,
      rotatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const second = await rotateAccessToken(testDb.db, {
      kind: "web_access_token",
      rawToken: "second-raw-token",
      pepper,
      rotatedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(second.version).toBe(2);
    const current = await readWebAccessSetting(testDb.db);
    expect(current.accessVersion).toBe(2);
    expect(await verifyOpaqueToken("first-raw-token", current.tokenHash, { pepper })).toBe(false);
    expect(await verifyOpaqueToken("second-raw-token", current.tokenHash, { pepper })).toBe(true);
    const stored = await testDb.pool.query("select token_hash from finance_access_settings");
    expect(JSON.stringify(stored.rows)).not.toContain("second-raw-token");
  });

  it("replaces the Shortcut hash without exposing the raw token on later reads", async () => {
    const pepper = "test-pepper";
    await rotateAccessToken(testDb.db, {
      kind: "shortcut_token",
      rawToken: "new-shortcut-token",
      pepper,
      rotatedAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    const current = await readShortcutAccessSetting(testDb.db);
    expect(Object.keys(current)).toEqual(["tokenHash"]);
    expect(await verifyOpaqueToken("new-shortcut-token", current.tokenHash, { pepper })).toBe(true);
  });
});
