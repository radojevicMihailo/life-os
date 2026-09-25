import { describe, expect, it } from "vitest";

import { parseEnv } from "@/modules/finance/config/env";

const validEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/finance_tracker",
  SESSION_SIGNING_SECRET: "12345678901234567890123456789012",
  ACCESS_TOKEN_HASH: "access-token-hash",
  ACCESS_TOKEN_PEPPER: "access-token-pepper",
  ACCESS_TOKEN_VERSION: "1",
  SHORTCUT_TOKEN_HASH: "shortcut-token-hash",
  CRON_SECRET: "cron-secret",
  APP_ORIGIN: "https://finance.example.com",
  REPORTING_CURRENCY: "EUR",
  DATABASE_POOL_MAX_CONNECTIONS: "5",
  DATABASE_CONNECTION_TIMEOUT_MS: "5000",
  DATABASE_IDLE_TIMEOUT_MS: "10000",
  DATABASE_STATEMENT_TIMEOUT_MS: "15000",
  DATABASE_QUERY_TIMEOUT_MS: "15000",
  PROVIDER_TIMEOUT_MS: "10000",
  EXCHANGE_RATE_STALE_AFTER_HOURS: "36",
  MARKET_DATA_STALE_AFTER_HOURS: "36",
  ALPHA_VANTAGE_API_KEY: "alpha-vantage-demo",
  COINGECKO_API_KEY: "coingecko-demo",
} as const;

describe("parseEnv", () => {
  it("does not require login secrets in single-user mode", () => {
    expect(parseEnv({ DATABASE_URL: "postgres://db" }).APP_ORIGIN).toBe("http://localhost:3000");
  });

  it("rejects a short session signing secret", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        SESSION_SIGNING_SECRET: "too-short",
      }),
    ).toThrow(/SESSION_SIGNING_SECRET/);
  });

  it("allows omitted inactive authentication configuration", () => {
    const withoutPepper: Record<string, string | undefined> = { ...validEnv };
    const withoutVersion: Record<string, string | undefined> = { ...validEnv };

    delete withoutPepper.ACCESS_TOKEN_PEPPER;
    delete withoutVersion.ACCESS_TOKEN_VERSION;

    expect(() => parseEnv(withoutPepper)).not.toThrow();
    expect(() => parseEnv(withoutVersion)).not.toThrow();
  });

  it("rejects an empty optional provider key when supplied", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        ALPHA_VANTAGE_API_KEY: "",
      }),
    ).toThrow(/ALPHA_VANTAGE_API_KEY/);
  });

  it("accepts missing optional provider keys", () => {
    const withoutProviderKeys: Record<string, string | undefined> = {
      ...validEnv,
    };

    delete withoutProviderKeys.ALPHA_VANTAGE_API_KEY;
    delete withoutProviderKeys.COINGECKO_API_KEY;

    const parsed = parseEnv(withoutProviderKeys);

    expect(parsed.ALPHA_VANTAGE_API_KEY).toBeUndefined();
    expect(parsed.COINGECKO_API_KEY).toBeUndefined();
  });

  it("accepts a complete server environment", () => {
    expect(parseEnv(validEnv).REPORTING_CURRENCY).toBe("EUR");
  });

  it("accepts an optional Alpha Vantage endpoint override", () => {
    expect(parseEnv({
      ...validEnv,
      ALPHA_VANTAGE_API_URL: "http://127.0.0.1:43210/alpha-vantage",
    }).ALPHA_VANTAGE_API_URL).toBe("http://127.0.0.1:43210/alpha-vantage");
  });
});
