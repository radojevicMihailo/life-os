import { Card } from "@/components/ui/card";
import { getPortfolio } from "@/lib/finance/portfolio";
import { PortfolioChart } from "../_components/PortfolioChart";

export const dynamic = "force-dynamic";

function fmtAmount(n: number, maxFrac = 8): string {
  return n.toLocaleString("sr-RS", { maximumFractionDigits: maxFrac });
}

function fmtEur(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("sr-RS", { maximumFractionDigits: 2 });
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

export default async function PortfolioPage() {
  const { rows, netWorthEur, groupTotals, bucketTotals } = await getPortfolio();
  const visibleRows = rows.filter((r) => r.amount !== 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Stanje po računima sa trenutnim EUR cenama (live spot pri svakom učitavanju).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Net worth po grupi</div>
          <PortfolioChart groupTotals={groupTotals} />
        </Card>

        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Net worth</div>
            <div className="text-xl font-semibold tabular-nums">{fmtEur(netWorthEur)} EUR</div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-2 text-sm font-medium border-b">Po buketu</div>
            <table className="w-full text-sm">
              <tbody>
                {bucketTotals.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-muted-foreground">
                      Nema podataka.
                    </td>
                  </tr>
                )}
                {bucketTotals.map((b) => (
                  <tr key={b.bucketId ?? "__null__"} className="border-t">
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtEur(b.eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Grupa</th>
              <th className="px-4 py-2 font-medium">Buket</th>
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium">Valuta</th>
              <th className="px-4 py-2 font-medium text-right">Cena (EUR)</th>
              <th className="px-4 py-2 font-medium text-right">Total (EUR)</th>
              <th className="px-4 py-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Nema stanja. Unesi transakcije ili početno stanje.
                </td>
              </tr>
            )}
            {visibleRows.map((r) => (
              <tr key={r.accountId} className="border-t">
                <td className="px-4 py-2">{r.groupName ?? "—"}</td>
                <td className="px-4 py-2">{r.bucketName ?? "—"}</td>
                <td className="px-4 py-2">{r.assetName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtAmount(r.amount)}</td>
                <td className="px-4 py-2">{r.currencyCode ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.priceEur == null
                    ? "—"
                    : r.priceEur.toLocaleString("sr-RS", { maximumFractionDigits: 6 })}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEur(r.totalEur)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtPct(r.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
