import Decimal from "decimal.js";

const FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;
const MAX_SOURCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("alpha_vantage_provider_error");
  }
  return value as Record<string, unknown>;
}

function canonical(value: Decimal) {
  return value.toFixed(18).replace(/\.?0+$/, "");
}

function plausible(timestamp: Date, now: Date) {
  const age = now.getTime() - timestamp.getTime();
  return Number.isFinite(timestamp.getTime()) &&
    age >= -FUTURE_TOLERANCE_MS && age <= MAX_SOURCE_AGE_MS;
}

export function parseAlphaVantageQuote(payload: unknown, expectedSymbol: string, now: Date) {
  const root = record(payload);
  if ("Note" in root || "Information" in root || "Error Message" in root) {
    throw new Error("alpha_vantage_provider_error");
  }
  const quote = record(root["Global Quote"]);
  const providerId = quote["01. symbol"];
  if (providerId !== expectedSymbol) throw new Error("alpha_vantage_symbol_mismatch");

  const price = new Decimal(String(quote["05. price"] ?? ""));
  if (!price.isFinite() || price.lte(0)) throw new Error("alpha_vantage_price_invalid");

  const providerTimestamp = new Date(`${String(quote["07. latest trading day"])}T00:00:00.000Z`);
  if (!plausible(providerTimestamp, now)) throw new Error("alpha_vantage_timestamp_invalid");

  return { price: canonical(price), providerId, providerTimestamp };
}

export function parseAlphaVantageSymbolSearch(payload: unknown, exactSymbol: string) {
  const root = record(payload);
  if ("Note" in root || "Information" in root || "Error Message" in root) {
    throw new Error("alpha_vantage_provider_error");
  }
  const matches = root.bestMatches;
  if (!Array.isArray(matches)) throw new Error("alpha_vantage_provider_error");
  const match = matches.map(record).find((candidate) => candidate["1. symbol"] === exactSymbol);
  if (!match) throw new Error("alpha_vantage_symbol_not_found");

  const currencyCode = String(match["8. currency"] ?? "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("alpha_vantage_currency_invalid");
  return {
    currencyCode,
    name: String(match["2. name"] ?? ""),
    providerId: exactSymbol,
    region: String(match["4. region"] ?? ""),
  };
}

export function parseAlphaVantageSymbolResolution(
  payload: unknown,
  input: { symbol: string; quoteCurrencyCode: string; exchange?: string | null },
) {
  const root = record(payload);
  if ("Note" in root || "Information" in root || "Error Message" in root) {
    throw new Error("alpha_vantage_provider_error");
  }
  const matches = root.bestMatches;
  if (!Array.isArray(matches)) throw new Error("alpha_vantage_provider_error");
  const symbol = input.symbol.trim().toUpperCase();
  const currencyCode = input.quoteCurrencyCode.trim().toUpperCase();
  const symbolCandidates = matches.map(record).filter((candidate) => {
    const providerId = String(candidate["1. symbol"] ?? "").toUpperCase();
    const candidateCurrency = String(candidate["8. currency"] ?? "").toUpperCase();
    return (providerId === symbol || providerId.startsWith(`${symbol}.`)) &&
      candidateCurrency === currencyCode;
  });
  if (symbolCandidates.length === 0) throw new Error("alpha_vantage_symbol_not_found");

  const configuredExchange = input.exchange?.trim().toLocaleLowerCase("en-US");
  const listingIdentity = configuredExchange === "deutsche börse/xetra" ||
    configuredExchange === "xetra"
    ? { suffix: ".DEX", region: "GERMANY" }
    : undefined;
  if (!listingIdentity) throw new Error("alpha_vantage_exchange_mismatch");
  const candidates = symbolCandidates.filter((candidate) => {
    const providerId = String(candidate["1. symbol"] ?? "").toUpperCase();
    const region = String(candidate["4. region"] ?? "").toUpperCase();
    return providerId.endsWith(listingIdentity.suffix) && region === listingIdentity.region;
  });
  if (candidates.length === 0) throw new Error("alpha_vantage_exchange_mismatch");
  if (candidates.length > 1) throw new Error("alpha_vantage_symbol_ambiguous");
  const match = candidates[0];
  return {
    currencyCode,
    name: String(match["2. name"] ?? ""),
    providerId: String(match["1. symbol"]),
    region: String(match["4. region"] ?? ""),
  };
}
