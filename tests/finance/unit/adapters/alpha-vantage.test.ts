import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseAlphaVantageQuote,
  parseAlphaVantageSymbolResolution,
  parseAlphaVantageSymbolSearch,
} from "@/modules/finance/adapters/alpha-vantage/parser";
import { AlphaVantageClient } from "@/modules/finance/adapters/alpha-vantage/client";

const now = new Date("2026-08-30T12:00:00.000Z");

async function jsonFixture(name: string) {
  return JSON.parse(await readFile(`tests/finance/fixtures/providers/${name}`, "utf8"));
}

describe("Alpha Vantage parser", () => {
  it("rejects a quote for a different exchange-specific symbol", async () => {
    const payload = await jsonFixture("alpha-vantage-global-quote.json");

    expect(parseAlphaVantageQuote(payload, "VWCE.DEX", now)).toEqual({
      price: "135.42",
      providerId: "VWCE.DEX",
      providerTimestamp: new Date("2026-08-28T00:00:00.000Z"),
    });
    expect(() => parseAlphaVantageQuote(payload, "VWCE.LON", now))
      .toThrowError("alpha_vantage_symbol_mismatch");
  });

  it("selects only an exact resolved symbol and preserves its exchange suffix", async () => {
    const payload = await jsonFixture("alpha-vantage-symbol-search.json");

    expect(parseAlphaVantageSymbolSearch(payload, "VWCE.DEX")).toEqual({
      currencyCode: "EUR",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerId: "VWCE.DEX",
      region: "Germany",
    });
    expect(() => parseAlphaVantageSymbolSearch(payload, "VWCE"))
      .toThrowError("alpha_vantage_symbol_not_found");
  });

  it("rejects a sole wrong-exchange listing even when symbol and currency match", () => {
    const configured = {
      exchange: "Deutsche Börse/Xetra",
      quoteCurrencyCode: "EUR",
      symbol: "VWCE",
    };

    expect(() => parseAlphaVantageSymbolResolution({ bestMatches: [{
      "1. symbol": "VWCE.LON",
      "2. name": "Vanguard FTSE All-World UCITS ETF",
      "4. region": "United Kingdom",
      "8. currency": "EUR",
    }] }, configured)).toThrowError("alpha_vantage_exchange_mismatch");
  });

  it("rejects non-positive prices, future dates, and provider limit payloads", async () => {
    const payload = await jsonFixture("alpha-vantage-global-quote.json");

    expect(() => parseAlphaVantageQuote({ ...payload, "Global Quote": {
      ...payload["Global Quote"], "05. price": "0",
    } }, "VWCE.DEX", now)).toThrowError("alpha_vantage_price_invalid");
    expect(() => parseAlphaVantageQuote({ ...payload, "Global Quote": {
      ...payload["Global Quote"], "07. latest trading day": "2030-01-01",
    } }, "VWCE.DEX", now)).toThrowError("alpha_vantage_timestamp_invalid");
    expect(() => parseAlphaVantageQuote({ Note: "API call frequency exceeded" }, "VWCE.DEX", now))
      .toThrowError("alpha_vantage_provider_error");
  });
});

describe("Alpha Vantage HTTP adapter", () => {
  it("sends requests to an explicitly configured endpoint", async () => {
    const urls: URL[] = [];
    const client = new AlphaVantageClient({
      apiKey: "alpha-key",
      apiUrl: "http://127.0.0.1:43210/alpha-vantage",
      clock: { now: () => now },
      fetch: async (input) => {
        urls.push(new URL(String(input)));
        return Response.json({ "Global Quote": {
          "01. symbol": "TEST.DEX",
          "05. price": "10.5",
          "07. latest trading day": "2026-08-28",
        } });
      },
      signal: new AbortController().signal,
    });

    await client.fetchQuotes([{
      instrumentId: "instrument-test",
      providerId: "TEST.DEX",
      quoteCurrencyCode: "EUR",
    }]);

    expect(urls[0].origin).toBe("http://127.0.0.1:43210");
    expect(urls[0].pathname).toBe("/alpha-vantage");
  });

  it("caps an automatic run at 25 one-symbol quote requests and exposes skipped IDs", async () => {
    const signal = new AbortController().signal;
    const urls: URL[] = [];
    const client = new AlphaVantageClient({
      apiKey: "alpha-key",
      clock: { now: () => now },
      fetch: async (input, init) => {
        expect(init?.signal).toBe(signal);
        const url = new URL(String(input));
        urls.push(url);
        const symbol = url.searchParams.get("symbol");
        return Response.json({ "Global Quote": {
          "01. symbol": symbol,
          "05. price": "10.5",
          "07. latest trading day": "2026-08-28",
        } });
      },
      signal,
    });
    const instruments = Array.from({ length: 26 }, (_, index) => ({
      instrumentId: `instrument-${index + 1}`,
      providerId: `TEST${index + 1}.DEX`,
      quoteCurrencyCode: "EUR",
    }));

    const result = await client.fetchQuotes(instruments);

    expect(urls).toHaveLength(25);
    expect(urls[0].searchParams.get("function")).toBe("GLOBAL_QUOTE");
    expect(urls[0].searchParams.get("apikey")).toBe("alpha-key");
    expect(urls[0].searchParams.get("symbol")).toBe("TEST1.DEX");
    expect(result.quotes).toHaveLength(25);
    expect(result.skippedProviderIds).toEqual(["TEST26.DEX"]);
  });

  it("resolves a unique exchange-specific provider symbol without guessing its suffix", async () => {
    const payload = await jsonFixture("alpha-vantage-symbol-search.json");
    const client = new AlphaVantageClient({
      apiKey: "alpha-key",
      clock: { now: () => now },
      fetch: async () => Response.json(payload),
      signal: new AbortController().signal,
    });

    await expect(client.resolveSymbol({
      exchange: "Deutsche Börse/Xetra",
      instrumentId: "instrument-vwce",
      isin: "IE00BK5BQT80",
      quoteCurrencyCode: "EUR",
      symbol: "VWCE",
    }))
      .resolves.toMatchObject({ providerId: "VWCE.DEX", currencyCode: "EUR" });
  });
});
