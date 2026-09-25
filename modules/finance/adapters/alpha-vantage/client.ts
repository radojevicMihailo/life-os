import type {
  MarketQuoteProvider,
  MarketQuoteRequest,
  MarketQuoteRequestBudget,
  MarketQuoteResolutionRequest,
} from "../../application/valuation";
import {
  parseAlphaVantageQuote,
  parseAlphaVantageSymbolResolution,
} from "./parser";

const API_URL = "https://www.alphavantage.co/query";
const FREE_DAILY_QUOTE_LIMIT = 25;

export class AlphaVantageClient implements MarketQuoteProvider {
  readonly provider = "alpha_vantage";
  readonly maxRequestsPerRefresh = FREE_DAILY_QUOTE_LIMIT;

  constructor(private readonly options: {
    apiKey: string;
    apiUrl?: string;
    fetch: typeof fetch;
    clock: { now(): Date };
    signal: AbortSignal;
  }) {}

  private url(params: Record<string, string>) {
    const url = new URL(this.options.apiUrl ?? API_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", this.options.apiKey);
    return url;
  }

  async resolveSymbol(
    input: MarketQuoteResolutionRequest,
    budget?: MarketQuoteRequestBudget,
  ) {
    if (budget) {
      if (budget.remaining <= 0) throw new Error("provider_request_budget_exhausted");
      budget.remaining -= 1;
    }
    const response = await this.options.fetch(this.url({
      function: "SYMBOL_SEARCH",
      keywords: input.isin ?? input.symbol,
    }), { signal: this.options.signal });
    if (!response.ok) throw new Error(`alpha_vantage_http_${response.status}`);
    return parseAlphaVantageSymbolResolution(await response.json(), input);
  }

  async fetchQuotes(
    requests: MarketQuoteRequest[],
    budget?: MarketQuoteRequestBudget,
  ) {
    const available = budget
      ? Math.max(0, Math.min(FREE_DAILY_QUOTE_LIMIT, budget.remaining))
      : FREE_DAILY_QUOTE_LIMIT;
    const selected = requests.slice(0, available);
    if (budget) budget.remaining -= selected.length;
    const quotes = [];
    const failures: Array<{ providerId: string; error: string }> = [];

    for (const request of selected) {
      try {
        const response = await this.options.fetch(this.url({
          function: "GLOBAL_QUOTE",
          symbol: request.providerId,
        }), { signal: this.options.signal });
        if (!response.ok) throw new Error(`alpha_vantage_http_${response.status}`);
        const rawPayload = await response.json();
        const retrievedAt = this.options.clock.now();
        const parsed = parseAlphaVantageQuote(rawPayload, request.providerId, retrievedAt);
        quotes.push({
          ...request,
          ...parsed,
          provider: this.provider,
          retrievedAt,
          rawPayload,
        });
      } catch (error) {
        failures.push({
          providerId: request.providerId,
          error: error instanceof Error ? error.message : "alpha_vantage_provider_error",
        });
      }
    }

    return {
      quotes,
      skippedProviderIds: requests.slice(available).map((request) => request.providerId),
      ...(failures.length > 0 ? { failures } : {}),
    };
  }
}
