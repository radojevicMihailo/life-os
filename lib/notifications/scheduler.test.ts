import { afterEach, expect, it, vi } from "vitest";
import { startReminderScheduler } from "./scheduler";
afterEach(() => vi.useRealTimers());
it("never overlaps slow ticks, survives errors and can stop", async () => {
  vi.useFakeTimers();
  let release!: () => void;
  let calls = 0;
  const stop = startReminderScheduler(async () => {
    calls++;
    if (calls === 1) await new Promise<void>((resolve) => { release = resolve; });
    if (calls === 2) throw new Error("temporary");
  }, () => {});
  await vi.advanceTimersByTimeAsync(1000);
  await vi.advanceTimersByTimeAsync(180000);
  expect(calls).toBe(1);
  release();
  await vi.advanceTimersByTimeAsync(60000);
  expect(calls).toBe(2);
  await vi.advanceTimersByTimeAsync(60000);
  expect(calls).toBe(3);
  stop();
  await vi.advanceTimersByTimeAsync(60000);
  expect(calls).toBe(3);
});
