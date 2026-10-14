import { afterEach, expect, it, vi } from "vitest";
import { startValuationScheduler, serializeValuationRefresh } from "@/modules/finance/application/refresh-scheduler";

afterEach(() => vi.useRealTimers());

it("refreshes at startup, then crypto hourly and FX daily", async () => {
  vi.useFakeTimers();
  const jobs: string[] = [];
  const stop = startValuationScheduler(async (scope) => { jobs.push(scope); });
  await vi.advanceTimersByTimeAsync(1000);
  expect(jobs).toEqual(["fx", "crypto"]);
  await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
  expect(jobs).toEqual(["fx", "crypto", "crypto"]);
  await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000);
  expect(jobs.filter((scope) => scope === "fx")).toHaveLength(2);
  expect(jobs.filter((scope) => scope === "crypto")).toHaveLength(25);
  stop();
  await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
  expect(jobs).toHaveLength(27);
});

it("does not overlap slow requests and retries only failed sources", async () => {
  vi.useFakeTimers();
  const jobs: string[] = [];
  let release!: () => void;
  let first = true;
  const stop = startValuationScheduler(async (scope) => {
    jobs.push(scope);
    if (scope === "fx" && first) {
      first = false;
      await new Promise<void>((resolve) => { release = resolve; });
      throw new Error("provider unavailable");
    }
  }, () => {});
  await vi.advanceTimersByTimeAsync(1000);
  await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
  expect(jobs).toEqual(["fx"]);
  release();
  await vi.advanceTimersByTimeAsync(0);
  expect(jobs).toEqual(["fx", "crypto"]);
  await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
  expect(jobs).toEqual(["fx", "crypto", "fx"]);
  stop();
});


it("serializes independent refresh requests and releases the queue after failure", async () => {
  const order: string[] = [];
  let release!: () => void;
  const first = serializeValuationRefresh(async () => {
    order.push("first-start");
    await new Promise<void>((resolve) => { release = resolve; });
    order.push("first-end");
    throw new Error("provider unavailable");
  });
  const failed = expect(first).rejects.toThrow("provider unavailable");
  const second = serializeValuationRefresh(async () => { order.push("second"); return 42; });
  await Promise.resolve();
  expect(order).toEqual(["first-start"]);
  release();
  await failed;
  expect(await second).toBe(42);
  expect(order).toEqual(["first-start", "first-end", "second"]);
});
