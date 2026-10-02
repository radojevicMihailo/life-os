import catalog from "./catalog.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query, release, end, connect } = vi.hoisted(() => ({
  query: vi.fn(), release: vi.fn(), end: vi.fn(), connect: vi.fn(),
}));
vi.mock("pg", () => ({
  default: { Pool: class {
    connect = connect;
    end = end;
  } },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgres://food-catalog-test");
  connect.mockResolvedValue({ query, release });
  query.mockResolvedValue({ rowCount: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe("food catalog seed", () => {
  it("inserts the complete catalog in a transaction without overwriting any existing record", async () => {
    await import("../../scripts/seed-foods.mjs");
    expect(query.mock.calls[0][0]).toBe("BEGIN");
    const inserts = query.mock.calls.filter(([sql]) => sql.startsWith("INSERT"));
    expect(inserts).toHaveLength(catalog.foods.length);
    expect(new Set(inserts.map(([, params]) => params[0])).size).toBe(catalog.foods.length);
    for (const [sql, params] of inserts) {
      expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
      expect(sql).not.toContain("UPDATE");
      expect(params).toHaveLength(6);
    }
    expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it("reuses the same IDs on a rerun and leaves existing records untouched", async () => {
    await import("../../scripts/seed-foods.mjs");
    const ids = query.mock.calls.filter(([sql]) => sql.startsWith("INSERT")).map(([, params]) => params[0]);
    vi.resetModules();
    query.mockClear();
    query.mockResolvedValue({ rowCount: 0 });
    await import("../../scripts/seed-foods.mjs");
    expect(query.mock.calls.filter(([sql]) => sql.startsWith("INSERT")).map(([, params]) => params[0])).toEqual(ids);
    expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
  });

  it("rolls back the complete seed if any insert fails", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("INSERT")) throw new Error("insert failed");
      return { rowCount: 0 };
    });
    await expect(import("../../scripts/seed-foods.mjs")).rejects.toThrow("insert failed");
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });
});
