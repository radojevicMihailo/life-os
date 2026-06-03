import "server-only";

type Source = "fiat" | "crypto" | "stock" | "self";

const FIAT = new Set(["EUR", "USD", "RSD", "HUF", "GBP", "CHF", "JPY"]);

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  DOGE: "dogecoin",
  BNB: "binancecoin",
  TON: "the-open-network",
};

const STOCK_YAHOO: Record<string, string> = {
  VWCE: "VWCE.DE",
  GOOGL: "GOOGL",
  AMD: "AMD",
};

function classify(code: string): Source {
  const c = code.toUpperCase();
  if (c === "EUR") return "self";
  if (FIAT.has(c)) return "fiat";
  if (COINGECKO_IDS[c]) return "crypto";
  if (STOCK_YAHOO[c]) return "stock";
  return "fiat";
}

function ddmmyyyy(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}-${m}-${y}`;
}

function epochRange(date: string): { from: number; to: number } {
  const ts = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
  return { from: ts - 86400, to: ts + 2 * 86400 };
}

async function fetchJson(url: string, opts?: { fresh?: boolean }): Promise<unknown> {
  const init: RequestInit = opts?.fresh
    ? { cache: "no-store" }
    : { cache: "force-cache", next: { revalidate: 86400 } };
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.json();
}

type ExchangerateResponse = {
  result?: string;
  conversion_rates?: Record<string, number>;
  conversion_rate?: number;
  "error-type"?: string;
};

async function exchangerateApiGet(path: string): Promise<ExchangerateResponse | null> {
  const key = process.env.EXCHANGERATE_API_KEY;
  if (!key) {
    console.warn("[fx] EXCHANGERATE_API_KEY not set");
    return null;
  }
  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/${path}`;
  console.log("[fx] GET", path);
  try {
    const data = (await fetchJson(url, { fresh: true })) as ExchangerateResponse;
    if (data.result !== "success") {
      console.warn("[fx] exchangerate-api error", path, data["error-type"]);
      return null;
    }
    console.log("[fx] OK", path, {
      rate: data.conversion_rate,
      hasRates: !!data.conversion_rates,
    });
    return data;
  } catch (err) {
    console.warn("[fx] exchangerate-api fetch failed", path, err);
    return null;
  }
}

async function fiatToEurOnDate(code: string, _date: string): Promise<number | null> {
  const upper = code.toUpperCase();
  if (upper === "EUR") return 1;
  // Free plan: latest pair only. History endpoint is paid (403).
  const pair = await exchangerateApiGet(`pair/${upper}/EUR`);
  const rate = pair?.conversion_rate;
  if (typeof rate === "number" && rate > 0) return rate;
  return null;
}

async function cryptoToEurOnDate(code: string, date: string): Promise<number | null> {
  const id = COINGECKO_IDS[code.toUpperCase()];
  if (!id) return null;
  try {
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/coins/${id}/history?date=${ddmmyyyy(date)}&localization=false`,
    )) as { market_data?: { current_price?: { eur?: number } } };
    return data.market_data?.current_price?.eur ?? null;
  } catch {
    return null;
  }
}

async function stockToEurOnDate(code: string, date: string): Promise<number | null> {
  const sym = STOCK_YAHOO[code.toUpperCase()];
  if (!sym) return null;
  try {
    const { from, to } = epochRange(date);
    const data = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${from}&period2=${to}&interval=1d`,
    )) as {
      chart?: {
        result?: Array<{
          meta?: { currency?: string };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const res = data.chart?.result?.[0];
    const closes = res?.indicators?.quote?.[0]?.close ?? [];
    const close = closes.reverse().find((v): v is number => typeof v === "number");
    if (close == null) return null;
    const ccy = res?.meta?.currency?.toUpperCase() ?? "USD";
    if (ccy === "EUR") return close;
    const ccyToEur = await fiatToEurOnDate(ccy, date);
    return ccyToEur != null ? close * ccyToEur : null;
  } catch {
    return null;
  }
}

export async function getEurPerUnit(code: string, date: string): Promise<number | null> {
  const kind = classify(code);
  if (kind === "self") return 1;
  if (kind === "fiat") return fiatToEurOnDate(code, date);
  if (kind === "crypto") return cryptoToEurOnDate(code, date);
  if (kind === "stock") return stockToEurOnDate(code, date);
  return null;
}

async function fiatToEurLatest(code: string): Promise<number | null> {
  const upper = code.toUpperCase();
  if (upper === "EUR") return 1;
  const pair = await exchangerateApiGet(`pair/${upper}/EUR`);
  const rate = pair?.conversion_rate;
  if (typeof rate === "number" && rate > 0) return rate;
  return null;
}

async function cryptoToEurLatest(code: string): Promise<number | null> {
  const id = COINGECKO_IDS[code.toUpperCase()];
  if (!id) return null;
  try {
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`,
    )) as Record<string, { eur?: number }>;
    return data[id]?.eur ?? null;
  } catch {
    return null;
  }
}

async function stockToEurLatest(code: string): Promise<number | null> {
  const sym = STOCK_YAHOO[code.toUpperCase()];
  if (!sym) return null;
  try {
    const data = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
    )) as {
      chart?: {
        result?: Array<{
          meta?: { currency?: string; regularMarketPrice?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const res = data.chart?.result?.[0];
    const closes = res?.indicators?.quote?.[0]?.close ?? [];
    const close =
      [...closes].reverse().find((v): v is number => typeof v === "number") ??
      res?.meta?.regularMarketPrice ??
      null;
    if (close == null) return null;
    const ccy = res?.meta?.currency?.toUpperCase() ?? "USD";
    if (ccy === "EUR") return close;
    const ccyToEur = await fiatToEurLatest(ccy);
    return ccyToEur != null ? close * ccyToEur : null;
  } catch {
    return null;
  }
}

export async function getEurPerUnitLatest(code: string): Promise<number | null> {
  const kind = classify(code);
  if (kind === "self") return 1;
  if (kind === "fiat") return fiatToEurLatest(code);
  if (kind === "crypto") return cryptoToEurLatest(code);
  if (kind === "stock") return stockToEurLatest(code);
  return null;
}

export async function getUsdPerEur(date: string): Promise<number | null> {
  return fiatToEurOnDate("USD", date).then((eurPerUsd) =>
    eurPerUsd && eurPerUsd > 0 ? 1 / eurPerUsd : null,
  );
}

export type FxComputed = {
  eurRate: number | null;
  eurAmount: number | null;
  usdRate: number | null;
  usdAmount: number | null;
};

export async function computeFx(opts: {
  amount: number;
  code: string;
  date: string;
}): Promise<FxComputed> {
  console.log("[fx] computeFx", opts);
  const eurPerUnit = await getEurPerUnit(opts.code, opts.date);
  const usdPerEur = await getUsdPerEur(opts.date);
  const eurAmount = eurPerUnit != null ? opts.amount * eurPerUnit : null;
  const usdAmount = eurAmount != null && usdPerEur != null ? eurAmount * usdPerEur : null;
  console.log("[fx] computeFx result", { eurPerUnit, usdPerEur, eurAmount, usdAmount });
  return {
    eurRate: eurPerUnit,
    eurAmount,
    usdRate: usdPerEur,
    usdAmount,
  };
}
