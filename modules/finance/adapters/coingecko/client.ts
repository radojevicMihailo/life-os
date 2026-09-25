import type {
  MarketQuoteProvider,
  MarketQuoteRequest,
} from "../../application/valuation";
import { parseCoinGeckoPrices } from "./parser";

const API_URL = "https://api.coingecko.com/api/v3/simple/price";

export class CoinGeckoClient implements MarketQuoteProvider {
  readonly provider = "coingecko";

  constructor(private readonly options: {
    apiKey: string;
    fetch: typeof fetch;
    clock: { now(): Date };
    signal: AbortSignal;
  }) {}

  async fetchQuotes(requests: MarketQuoteRequest[]) {
    const quotes = [];
    const failures: Array<{ providerId: string; error: string }> = [];
    const byCurrency = Map.groupBy(
      requests,
      (request) => request.quoteCurrencyCode.toUpperCase(),
    );

    for (const [currencyCode, group] of byCurrency) {
      const url = new URL(API_URL);
      url.searchParams.set("ids", group.map((request) => request.providerId).join(","));
      url.searchParams.set("vs_currencies", currencyCode.toLowerCase());
      url.searchParams.set("include_last_updated_at", "true");
      const response = await this.options.fetch(url, {
        headers: { "x-cg-demo-api-key": this.options.apiKey },
        signal: this.options.signal,
      });
      if (!response.ok) throw new Error(`coingecko_http_${response.status}`);

      const rawPayload = await response.json();
      const retrievedAt = this.options.clock.now();
      const parsed = parseCoinGeckoPrices(
        rawPayload,
        group.map((request) => request.providerId),
        currencyCode,
        retrievedAt,
      );
      failures.push(...parsed.failures);
      for (const result of parsed.prices) {
        const request = group.find((candidate) => candidate.providerId === result.providerId);
        if (!request) throw new Error("coingecko_coin_not_found");
        quotes.push({
          ...request,
          ...result,
          provider: this.provider,
          retrievedAt,
          rawPayload,
        });
      }
    }

    return {
      quotes,
      skippedProviderIds: [],
      ...(failures.length > 0 ? { failures } : {}),
    };
  }
}
