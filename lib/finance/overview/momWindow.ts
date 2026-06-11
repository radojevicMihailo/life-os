import { daySpan } from "./granularity";

function isoUtc(year: number, month0: number, day: number): string {
  const d = new Date(Date.UTC(year, month0, day));
  return d.toISOString().slice(0, 10);
}

function shiftIso(iso: string, deltaDays: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  return isoUtc(y, m, d + deltaDays);
}

export function priorWindow(fromIso: string, toIso: string): { from: string; to: string } {
  const len = daySpan(fromIso, toIso);
  return {
    from: shiftIso(fromIso, -len),
    to: shiftIso(fromIso, -1),
  };
}
