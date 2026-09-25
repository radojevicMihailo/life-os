import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { parseCoinGeckoPrices } from "@/modules/finance/adapters/coingecko/parser";
import { CoinGeckoClient } from "@/modules/finance/adapters/coingecko/client";

const now = new Date("2026-08-30T12:00:00.000Z");

async function fixture() {
  return JSON.parse(await readFile("tests/finance/fixtures/providers/coingecko-simple-price.json", "utf8"));
}

describe("CoinGecko simple-price parser", () => {
  it("matches stable coin IDs exactly instead of ambiguous symbols", async () => {
    const payload = await fixture();

    expect(parseCoinGeckoPrices(payload, ["bitcoin", "ethereum"], "EUR", now))
      .toEqual({ failures: [], prices: [
        { price: "102345.67", providerId: "bitcoin", providerTimestamp: new Date("2026-08-30T07:59:00.000Z") },
        { price: "4321.09", providerId: "ethereum", providerTimestamp: new Date("2026-08-30T07:58:00.000Z") },
      ] });
    expect(parseCoinGeckoPrices(payload, ["btc"], "EUR", now)).toEqual({
      failures: [{ providerId: "btc", error: "coingecko_coin_not_found" }],
      prices: [],
    });
  });

  it("rejects non-positive prices, implausible timestamps, and error payloads", async () => {
    const payload = await fixture();

    expect(parseCoinGeckoPrices({ ...payload, bitcoin: {
      ...payload.bitcoin, eur: 0,
    } }, ["bitcoin"], "EUR", now)).toEqual({
      failures: [{ providerId: "bitcoin", error: "coingecko_price_invalid" }],
      prices: [],
    });
    expect(parseCoinGeckoPrices({ bitcoin: {
      eur: 1, last_updated_at: 2_000_000_000,
    } }, ["bitcoin"], "EUR", now)).toEqual({
      failures: [{ providerId: "bitcoin", error: "coingecko_timestamp_invalid" }],
      prices: [],
    });
    expect(() => parseCoinGeckoPrices({ error: "rate limit" }, ["bitcoin"], "EUR", now))
      .toThrowError("coingecko_provider_error");
  });
});

describe("CoinGecko HTTP adapter", () => {
  it("batches stable coin IDs and requests provider timestamps", async () => {
    const signal = new AbortController().signal;
    const payload = await fixture();
    let request: { headers: Headers; url: URL } | undefined;
    const client = new CoinGeckoClient({
      apiKey: "coin-key",
      clock: { now: () => now },
      fetch: async (input, init) => {
        request = { headers: new Headers(init?.headers), url: new URL(String(input)) };
        expect(init?.signal).toBe(signal);
        return Response.json(payload);
      },
      signal,
    });

    const result = await client.fetchQuotes([
      { instrumentId: "instrument-btc", providerId: "bitcoin", quoteCurrencyCode: "EUR" },
      { instrumentId: "instrument-eth", providerId: "ethereum", quoteCurrencyCode: "EUR" },
    ]);

    expect(request?.url.searchParams.get("ids")).toBe("bitcoin,ethereum");
    expect(request?.url.searchParams.get("vs_currencies")).toBe("eur");
    expect(request?.url.searchParams.get("include_last_updated_at")).toBe("true");
    expect(request?.headers.get("x-cg-demo-api-key")).toBe("coin-key");
    expect(result.quotes.map((quote) => quote.providerId)).toEqual(["bitcoin", "ethereum"]);
  });

  it("returns valid siblings and per-ID failures from a mixed batch", async () => {
    const payload = await fixture();
    const client = new CoinGeckoClient({
      apiKey: "coin-key",
      clock: { now: () => now },
      fetch: async () => Response.json({
        bitcoin: payload.bitcoin,
        ethereum: { ...payload.ethereum, eur: 0 },
      }),
      signal: new AbortController().signal,
    });

    const result = await client.fetchQuotes([
      { instrumentId: "instrument-btc", providerId: "bitcoin", quoteCurrencyCode: "EUR" },
      { instrumentId: "instrument-eth", providerId: "ethereum", quoteCurrencyCode: "EUR" },
      { instrumentId: "instrument-missing", providerId: "missing", quoteCurrencyCode: "EUR" },
    ]);

    expect(result.quotes.map((quote) => quote.providerId)).toEqual(["bitcoin"]);
    expect(result.failures).toEqual([
      { providerId: "ethereum", error: "coingecko_price_invalid" },
      { providerId: "missing", error: "coingecko_coin_not_found" },
    ]);
  });
});
