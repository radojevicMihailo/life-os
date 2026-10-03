import { Money } from "./money";

export function GoalProgress({ name, balance, percentage, targetAmount, currencyCode, underfunded = false, stale = false }: {
  name: string;
  balance: string | null;
  percentage: string | null;
  targetAmount: string;
  currencyCode: string;
  underfunded?: boolean;
  stale?: boolean;
}) {
  const complete = balance !== null && percentage !== null;
  const numeric = complete ? Number(percentage) : 0;
  const bar = Math.min(100, Math.max(0, numeric));
  const label = new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 1 }).format(numeric);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
      <span className="min-w-0 break-words tabular-nums">{balance === null ? <span className="text-amber-500">Nedostaje kurs</span> : <Money amount={balance} currencyCode={currencyCode} label="Rezervisano" />} <span className="text-muted-foreground">/ <Money amount={targetAmount} currencyCode={currencyCode} label="Cilj" /></span></span>
      {complete ? <span className={`text-sm font-semibold tabular-nums ${underfunded ? "text-amber-500" : "text-primary"}`}>{label}%</span> : null}
    </div>
    {complete ? <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${name}: ${label}% rezervisano`} aria-valuenow={bar} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${underfunded ? "bg-amber-500" : "bg-gradient-to-r from-blue-500 to-emerald-400"}`} style={{ width: `${bar}%` }} />
    </div> : <p className="text-xs text-muted-foreground">Ukupna vrednost nije dostupna dok se ne unese kurs.</p>}
    {stale ? <p className="text-xs text-amber-500">Procena koristi zastareo kurs. Osveži kurs za pouzdan prikaz.</p> : null}
    {underfunded ? <p className="text-xs text-amber-500">Nedostaje novac na računu za deo rezervacija.</p> : null}
  </div>;
}
