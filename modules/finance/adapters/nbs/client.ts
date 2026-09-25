import type { FxRateProvider } from "../../application/valuation";
import { deriveEurCrossRates, parseNbsMiddleRateHtml } from "./parser";

const CURRENT_MIDDLE_RATE_URL =
  "https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate";

export class NbsClient implements FxRateProvider {
  readonly provider = "nbs";

  constructor(private readonly options: {
    fetch: typeof fetch;
    clock: { now(): Date };
    signal: AbortSignal;
  }) {}

  async fetchRates(baseCurrencyCodes: string[]) {
    const response = await this.options.fetch(CURRENT_MIDDLE_RATE_URL, {
      headers: { accept: "text/html" },
      signal: this.options.signal,
    });
    if (!response.ok) throw new Error(`nbs_http_${response.status}`);

    const rawPayload = await response.text();
    const retrievedAt = this.options.clock.now();
    const parsed = parseNbsMiddleRateHtml(rawPayload, retrievedAt);
    const providerTimestamp = parsed[0]?.providerTimestamp;
    if (!providerTimestamp) throw new Error("nbs_payload_invalid");
    const requested = new Set(baseCurrencyCodes.map((code) => code.trim().toUpperCase()));

    return deriveEurCrossRates(parsed)
      .filter((rate) => requested.has(rate.baseCurrencyCode))
      .map((rate) => ({
        ...rate,
        provider: this.provider,
        providerTimestamp,
        retrievedAt,
        rawPayload,
      }));
  }
}
