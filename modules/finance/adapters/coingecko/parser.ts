import Decimal from "decimal.js";

const FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;
const MAX_SOURCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("coingecko_provider_error");
  }
  return value as Record<string, unknown>;
}

function canonical(value: Decimal) {
  return value.toFixed(18).replace(/\.?0+$/, "");
}

export function parseCoinGeckoPrices(
  payload: unknown,
  exactCoinIds: string[],
  quoteCurrencyCode: string,
  now: Date,
) {
  const root = record(payload);
  if ("error" in root || "status" in root) throw new Error("coingecko_provider_error");
  const quoteKey = quoteCurrencyCode.toLowerCase();
  const prices: Array<{ price: string; providerId: string; providerTimestamp: Date }> = [];
  const failures: Array<{ providerId: string; error: string }> = [];

  for (const providerId of exactCoinIds) {
    try {
      if (!(providerId in root)) throw new Error("coingecko_coin_not_found");
      const quote = record(root[providerId]);
      const price = new Decimal(String(quote[quoteKey] ?? ""));
      if (!price.isFinite() || price.lte(0)) throw new Error("coingecko_price_invalid");

      const seconds = quote.last_updated_at;
      if (typeof seconds !== "number" || !Number.isInteger(seconds)) {
        throw new Error("coingecko_timestamp_invalid");
      }
      const providerTimestamp = new Date(seconds * 1_000);
      const age = now.getTime() - providerTimestamp.getTime();
      if (!Number.isFinite(providerTimestamp.getTime()) ||
        age < -FUTURE_TOLERANCE_MS || age > MAX_SOURCE_AGE_MS) {
        throw new Error("coingecko_timestamp_invalid");
      }

      prices.push({ price: canonical(price), providerId, providerTimestamp });
    } catch (error) {
      failures.push({
        providerId,
        error: error instanceof Error ? error.message : "coingecko_provider_error",
      });
    }
  }

  return { failures, prices };
}
