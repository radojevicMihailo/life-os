import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  deriveEurCrossRates,
  parseNbsMiddleRateHtml,
} from "@/modules/finance/adapters/nbs/parser";
import { NbsClient } from "@/modules/finance/adapters/nbs/client";

const now = new Date("2026-08-30T12:00:00.000Z");

async function fixture() {
  return readFile("tests/finance/fixtures/providers/nbs-current-middle-rate.html", "utf8");
}

describe("NBS middle-rate parser", () => {
  it("normalizes VAŽI ZA units before deriving EUR cross-rates", async () => {
    const rates = deriveEurCrossRates(parseNbsMiddleRateHtml(await fixture(), now));

    expect(rates).toEqual([
      { baseCurrencyCode: "EUR", quoteCurrencyCode: "EUR", rate: "1" },
      { baseCurrencyCode: "HUF", quoteCurrencyCode: "EUR", rate: "0.002559726962457338" },
      { baseCurrencyCode: "RSD", quoteCurrencyCode: "EUR", rate: "0.008532423208191126" },
      { baseCurrencyCode: "USD", quoteCurrencyCode: "EUR", rate: "0.853242320819112628" },
    ]);
  });

  it("rejects non-positive rates and implausible formation dates", async () => {
    const html = await fixture();

    expect(() => parseNbsMiddleRateHtml(html.replace("100,0000", "0,0000"), now))
      .toThrowError("nbs_rate_invalid");
    expect(() => parseNbsMiddleRateHtml(html.replace("29.8.2026", "29.8.2030"), now))
      .toThrowError("nbs_timestamp_invalid");
  });

  it("accepts the official public page's Cyrillic formation heading", async () => {
    const html = (await fixture()).replace(
      "FORMIRANA NA DAN",
      "ФОРМИРАНА НА ДАН",
    );

    expect(parseNbsMiddleRateHtml(html, now)).toHaveLength(3);
  });
});

describe("NBS HTTP adapter", () => {
  it("uses the public current-middle-rate list and returns only requested EUR conversions", async () => {
    const signal = new AbortController().signal;
    const requests: Array<{ input: string; signal: AbortSignal | null | undefined }> = [];
    const client = new NbsClient({
      clock: { now: () => now },
      fetch: async (input, init) => {
        requests.push({ input: String(input), signal: init?.signal });
        return new Response(await fixture(), { status: 200 });
      },
      signal,
    });

    const rates = await client.fetchRates(["USD", "RSD"]);

    expect(requests).toEqual([{
      input: "https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate",
      signal,
    }]);
    expect(rates.map(({ baseCurrencyCode, rate }) => ({ baseCurrencyCode, rate }))).toEqual([
      { baseCurrencyCode: "RSD", rate: "0.008532423208191126" },
      { baseCurrencyCode: "USD", rate: "0.853242320819112628" },
    ]);
  });
});
