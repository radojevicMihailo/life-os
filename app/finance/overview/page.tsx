import {
  getMomComparison,
  getOverviewAggregates,
  getSixMonthBars,
} from "../_actions/overview";
import { OverviewPeriodPicker } from "../_components/OverviewPeriodPicker";
import { KpiCard } from "../_components/KpiCard";
import { CashflowChart } from "../_components/CashflowChart";
import { CategoryBreakdownTable } from "../_components/CategoryBreakdownTable";
import { SixMonthChart } from "../_components/SixMonthChart";
import { InvestmentSummaryCard } from "../_components/InvestmentSummaryCard";
import { fmtDelta } from "@/lib/finance/overview/formatters";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

function parseRange(sp: { from?: string | string[]; to?: string | string[] }): {
  from: string;
  to: string;
} {
  const def = defaultRange();
  const rawFrom = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const rawTo = Array.isArray(sp.to) ? sp.to[0] : sp.to;
  const isIso = (s: string | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  let from = isIso(rawFrom) ? rawFrom : def.from;
  let to = isIso(rawTo) ? rawTo : def.to;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

export default async function FinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  const sp = await searchParams;
  const { from, to } = parseRange(sp);
  const todayIso = new Date().toISOString().slice(0, 10);

  const [aggregates, mom, sixMonth] = await Promise.all([
    getOverviewAggregates(from, to),
    getMomComparison(from, to),
    getSixMonthBars(todayIso),
  ]);

  const incomeDelta = fmtDelta(mom.current.income, mom.prior.income);
  const expenseDelta = fmtDelta(mom.current.expense, mom.prior.expense);
  const netDelta = fmtDelta(mom.current.net, mom.prior.net);

  const expenseRows = aggregates.byCategory.filter((r) => r.kind === "expense");
  const incomeRows = aggregates.byCategory.filter((r) => r.kind === "income");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pregled</h1>
        <p className="text-sm text-muted-foreground">
          Prihodi, troškovi i investicije po periodu (sve u EUR).
        </p>
      </div>

      <OverviewPeriodPicker initialFrom={from} initialTo={to} />

      {aggregates.excludedNullEur > 0 && (
        <Card className="p-3 text-sm text-amber-700 bg-amber-50 border-amber-200">
          {aggregates.excludedNullEur} transakcija bez EUR konverzije nije uračunato.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Prihod"
          value={mom.current.income}
          delta={incomeDelta}
          favorable="positive"
        />
        <KpiCard
          label="Trošak"
          value={mom.current.expense}
          delta={expenseDelta}
          favorable="negative"
        />
        <KpiCard
          label="Neto"
          value={mom.current.net}
          delta={netDelta}
          favorable="positive"
        />
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Tok novca</div>
        <CashflowChart
          buckets={aggregates.cashflowBuckets}
          granularity={aggregates.granularity}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryBreakdownTable title="Trošak po kategoriji" rows={expenseRows} />
        <CategoryBreakdownTable title="Prihod po kategoriji" rows={incomeRows} />
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Poslednjih 6 meseci</div>
        <SixMonthChart data={sixMonth} />
      </Card>

      <InvestmentSummaryCard from={from} to={to} />
    </div>
  );
}
