import Decimal from "decimal.js";

const ExactDecimal = Decimal.clone({ precision: 80 });
const MAX_SOURCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;

export interface NbsMiddleRate {
  currencyCode: string;
  unit: string;
  middleRateRsd: string;
  providerTimestamp: Date;
}

function canonical(value: Decimal) {
  return value.toFixed(18).replace(/\.?0+$/, "");
}

function text(cell: string) {
  return cell.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
}

function decimal(value: string) {
  return value.replaceAll(".", "").replace(",", ".");
}

function assertPlausible(timestamp: Date, now: Date) {
  const age = now.getTime() - timestamp.getTime();
  if (!Number.isFinite(timestamp.getTime()) || age < -FUTURE_TOLERANCE_MS || age > MAX_SOURCE_AGE_MS) {
    throw new Error("nbs_timestamp_invalid");
  }
}

export function parseNbsMiddleRateHtml(payload: string, now: Date): NbsMiddleRate[] {
  const dateMatch = /(?:FORMIRANA\s+NA\s+DAN|ФОРМИРАНА\s+НА\s+ДАН)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/iu.exec(payload);
  if (!dateMatch) throw new Error("nbs_timestamp_invalid");

  const providerTimestamp = new Date(Date.UTC(
    Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]),
  ));
  assertPlausible(providerTimestamp, now);

  const rows: NbsMiddleRate[] = [];
  for (const match of payload.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/giu)]
      .map((cell) => text(cell[1]));
    if (cells.length < 5 || !/^[A-Z]{3}$/.test(cells[0])) continue;

    const unit = new ExactDecimal(decimal(cells[3]));
    const middleRateRsd = new ExactDecimal(decimal(cells[4]));
    if (!unit.isInteger() || unit.lte(0) || middleRateRsd.lte(0)) {
      throw new Error("nbs_rate_invalid");
    }
    rows.push({
      currencyCode: cells[0],
      unit: canonical(unit),
      middleRateRsd: canonical(middleRateRsd),
      providerTimestamp,
    });
  }

  if (rows.length === 0 || !rows.some((row) => row.currencyCode === "EUR")) {
    throw new Error("nbs_payload_invalid");
  }
  return rows;
}

export function deriveEurCrossRates(rates: NbsMiddleRate[]) {
  const eur = rates.find((rate) => rate.currencyCode === "EUR");
  if (!eur) throw new Error("nbs_eur_rate_missing");

  const eurRsdPerUnit = new ExactDecimal(eur.middleRateRsd).div(eur.unit);
  const result = rates.map((rate) => ({
    baseCurrencyCode: rate.currencyCode,
    quoteCurrencyCode: "EUR" as const,
    rate: canonical(
      new ExactDecimal(rate.middleRateRsd).div(rate.unit).div(eurRsdPerUnit),
    ),
  }));
  result.push({
    baseCurrencyCode: "RSD",
    quoteCurrencyCode: "EUR",
    rate: canonical(new ExactDecimal(1).div(eurRsdPerUnit)),
  });

  return result.sort((left, right) => left.baseCurrencyCode.localeCompare(right.baseCurrencyCode));
}
