import { describe, expect, it, vi } from "vitest";

import { requireSameOrigin } from "@/modules/finance/auth/origin";

function requestFrom(origin: string | null, headers?: Record<string, string>) {
  return new Request("http://internal.localhost/api/transactions", {
    headers: {
      ...(origin === null ? {} : { origin }),
      ...headers,
    },
    method: "POST",
  });
}

function stubRequiredEnv(appOrigin: string) {
  vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/finance_tracker");
  vi.stubEnv("SESSION_SIGNING_SECRET", "12345678901234567890123456789012");
  vi.stubEnv("ACCESS_TOKEN_HASH", "access-token-hash");
  vi.stubEnv("ACCESS_TOKEN_PEPPER", "access-token-pepper");
  vi.stubEnv("ACCESS_TOKEN_VERSION", "1");
  vi.stubEnv("SHORTCUT_TOKEN_HASH", "shortcut-token-hash");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("APP_ORIGIN", appOrigin);
  vi.stubEnv("REPORTING_CURRENCY", "EUR");
  vi.stubEnv("DATABASE_POOL_MAX_CONNECTIONS", "5");
  vi.stubEnv("DATABASE_CONNECTION_TIMEOUT_MS", "5000");
  vi.stubEnv("DATABASE_IDLE_TIMEOUT_MS", "10000");
  vi.stubEnv("DATABASE_STATEMENT_TIMEOUT_MS", "15000");
  vi.stubEnv("DATABASE_QUERY_TIMEOUT_MS", "15000");
  vi.stubEnv("PROVIDER_TIMEOUT_MS", "10000");
  vi.stubEnv("EXCHANGE_RATE_STALE_AFTER_HOURS", "36");
  vi.stubEnv("MARKET_DATA_STALE_AFTER_HOURS", "36");
}

describe("same-origin web mutation guard", () => {
  it("accepts the canonical application origin", () => {
    expect(() =>
      requireSameOrigin(requestFrom("https://finance.example.com"), {
        appOrigin: "https://finance.example.com",
      }),
    ).not.toThrow();
  });

  it("rejects cross-site origins", () => {
    expect(() =>
      requireSameOrigin(requestFrom("https://evil.example"), {
        appOrigin: "https://finance.example.com",
      }),
    ).toThrow("invalid_origin");
  });

  it("rejects absent or malformed Origin headers", () => {
    expect(() =>
      requireSameOrigin(requestFrom(null), {
        appOrigin: "https://finance.example.com",
      }),
    ).toThrow("invalid_origin");
    expect(() =>
      requireSameOrigin(requestFrom("not a url"), {
        appOrigin: "https://finance.example.com",
      }),
    ).toThrow("invalid_origin");
  });

  it("canonicalizes default ports", () => {
    expect(() =>
      requireSameOrigin(requestFrom("https://finance.example.com:443"), {
        appOrigin: "https://finance.example.com",
      }),
    ).not.toThrow();
  });

  it("uses the configured app origin rather than request-controlled forwarded headers", () => {
    stubRequiredEnv("https://finance.example.com");

    expect(() =>
      requireSameOrigin(
        requestFrom("https://evil.example", {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toThrow("invalid_origin");
  });

  it("accepts the configured origin when the internal request target differs", () => {
    stubRequiredEnv("https://finance.example.com");

    expect(() =>
      requireSameOrigin(requestFrom("https://finance.example.com")),
    ).not.toThrow();
  });
});
