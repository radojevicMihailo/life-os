export function fmtEur(n: number): string {
  return n.toLocaleString("sr-RS", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(n: number): string {
  const pct = n * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  const abs = Math.abs(pct).toLocaleString("sr-RS", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${abs}%`;
}

export function fmtDelta(curr: number, prior: number): { pct: number | null; sign: -1 | 0 | 1 } {
  if (prior === 0) return { pct: null, sign: 0 };
  const pct = (curr - prior) / Math.abs(prior);
  const sign: -1 | 0 | 1 = pct > 0 ? 1 : pct < 0 ? -1 : 0;
  return { pct, sign };
}
