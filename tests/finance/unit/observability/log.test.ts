import { describe, expect, it } from "vitest";

import { createOperationalLogger } from "@/modules/finance/observability/log";

describe("operational logger", () => {
  it("keeps operational context while dropping secrets and financial payloads", () => {
    const lines: string[] = [];
    const logger = createOperationalLogger({
      now: () => new Date("2026-09-03T08:00:00.000Z"),
      write: (line) => lines.push(line),
    });

    logger.warn("valuation.refresh.partial", {
      requestId: "request-13",
      durationMs: 37,
      provider: "alpha-vantage",
      status: "partial",
      errorCode: "provider_timeout",
      authorization: "Bearer raw-shortcut-token",
      cookie: "session=raw-session-token",
      token: "raw-access-token",
      tokenHash: "stored-token-hash",
      requestBody: { amount: "125.00", currency: "EUR" },
      accountNotes: "Private account note",
      counterparty: "Private Person",
      providerApiKey: "provider-secret",
    });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      timestamp: "2026-09-03T08:00:00.000Z",
      level: "warn",
      event: "valuation.refresh.partial",
      requestId: "request-13",
      durationMs: 37,
      provider: "alpha-vantage",
      status: "partial",
      errorCode: "provider_timeout",
    });
    expect(lines[0]).not.toMatch(
      /raw-shortcut-token|raw-session-token|raw-access-token|stored-token-hash|125\.00|Private account note|Private Person|provider-secret/,
    );
  });

  it("rejects unstable free-form event names", () => {
    const logger = createOperationalLogger({ write: () => undefined });

    expect(() => logger.info("Daily refresh finished!", {})).toThrow(
      "invalid_operational_event_name",
    );
  });
});
