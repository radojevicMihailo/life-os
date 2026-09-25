import { describe, expect, it } from "vitest";

import { createOperationalLogger } from "@/modules/finance/observability/log";
import { createDailyRefreshHandler } from "@/modules/finance/ui/cron-route";

describe("daily refresh cron route", () => {
  it("rejects a public request without invoking provider refresh", async () => {
    let calls = 0;
    const lines: string[] = [];
    const handler = createDailyRefreshHandler({
      cronSecret: "cron-secret",
      logger: createOperationalLogger({ write: (line) => lines.push(line) }),
      refresh: async () => {
        calls += 1;
        return { failedCount: 0, runIds: [], succeededCount: 0 };
      },
    });

    const response = await handler(new Request("https://app.test/api/cron/daily-refresh"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(calls).toBe(0);
    expect(lines).toHaveLength(1);
  });

  it("accepts only the exact bearer secret and returns the persisted refresh summary", async () => {
    const lines: string[] = [];
    const handler = createDailyRefreshHandler({
      cronSecret: "cron-secret",
      createRequestId: () => "generated-request-id",
      clock: { now: () => new Date("2026-09-03T08:00:00.050Z") },
      logger: createOperationalLogger({
        now: () => new Date("2026-09-03T08:00:00.050Z"),
        write: (line) => lines.push(line),
      }),
      refresh: async () => ({
        failedCount: 1,
        runIds: ["run-nbs", "run-alpha"],
        succeededCount: 3,
      }),
    });
    const request = new Request("https://app.test/api/cron/daily-refresh", {
      headers: { authorization: "Bearer cron-secret" },
    });

    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("generated-request-id");
    expect(await response.json()).toEqual({
      failedCount: 1,
      runIds: ["run-nbs", "run-alpha"],
      succeededCount: 3,
    });
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      timestamp: "2026-09-03T08:00:00.050Z",
      level: "info",
      event: "valuation.daily_refresh.completed",
      requestId: "generated-request-id",
      durationMs: 0,
      provider: "all",
      status: "partial",
      errorCode: "partial_refresh",
    });
  });

  it("replaces an unsafe inbound request ID before logging or returning it", async () => {
    const lines: string[] = [];
    const handler = createDailyRefreshHandler({
      cronSecret: "cron-secret",
      createRequestId: () => "safe-generated-id",
      logger: createOperationalLogger({ write: (line) => lines.push(line) }),
      refresh: async () => ({ failedCount: 0, runIds: [], succeededCount: 0 }),
    });

    const response = await handler(new Request("https://app.test/api/cron/daily-refresh", {
      headers: { "x-request-id": "rawAccessTokenThatLooksSafe123" },
    }));

    expect(response.headers.get("x-request-id")).toBe("safe-generated-id");
    expect(JSON.parse(lines[0] ?? "").requestId).toBe("safe-generated-id");
  });

  it("returns a generic refresh failure after recording a safe operational event", async () => {
    const failure = new Error("provider transport failed with private details");
    const lines: string[] = [];
    const handler = createDailyRefreshHandler({
      cronSecret: "cron-secret",
      createRequestId: () => "failure-request-id",
      logger: createOperationalLogger({
        now: () => new Date("2026-09-03T08:00:00.000Z"),
        write: (line) => lines.push(line),
      }),
      refresh: async () => {
        throw failure;
      },
    });

    const response = await handler(new Request("https://app.test/api/cron/daily-refresh", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("failure-request-id");
    expect(await response.json()).toEqual({ error: "refresh_failed" });
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "error",
      event: "valuation.daily_refresh.failed",
      requestId: "failure-request-id",
      status: "failed",
      errorCode: "refresh_failed",
    });
    expect(lines[0]).not.toContain("private details");
  });
});
