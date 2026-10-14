import { afterEach, expect, it, vi } from "vitest";

const { Pool } = vi.hoisted(() => ({ Pool: vi.fn(class Pool {}) }));
vi.mock("pg", () => ({ Pool }));

afterEach(() => {
  delete (globalThis as typeof globalThis & { lifeOsPool?: unknown }).lifeOsPool;
  vi.unstubAllEnvs();
  vi.resetModules();
  Pool.mockClear();
});

it("shares the database pool across independently loaded production modules", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const first = await import("../../../db/pool");
  vi.resetModules();
  const second = await import("../../../db/pool");
  expect(second.pool).toBe(first.pool);
  expect(Pool).toHaveBeenCalledOnce();
});
