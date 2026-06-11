import type { Granularity } from "./types";

export function daySpan(fromIso: string, toIso: string): number {
  const [a, b] = fromIso <= toIso ? [fromIso, toIso] : [toIso, fromIso];
  const start = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10)),
  );
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function chooseGranularity(fromIso: string, toIso: string): Granularity {
  const span = daySpan(fromIso, toIso);
  if (span <= 31) return "day";
  if (span <= 92) return "week";
  return "month";
}
