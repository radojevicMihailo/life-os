"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Account,
  Currency,
  Transaction,
  TransactionCategory,
  TransactionTypeRow,
} from "@/db/schema/finance";
import { colorStyle } from "@/lib/finance/colors";

const ALL = "__all__";

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

function fmtAmount(amount: string | null, code: string | undefined): string {
  if (amount == null) return "";
  const n = Number(amount);
  if (Number.isNaN(n)) return "";
  return `${n.toLocaleString("sr-RS", { maximumFractionDigits: 8 })} ${code ?? ""}`.trim();
}

export function TransactionList({
  rows,
  types,
  accounts,
  currencies,
  categories,
}: {
  rows: Transaction[];
  types: TransactionTypeRow[];
  accounts: Account[];
  currencies: Currency[];
  categories: TransactionCategory[];
}) {
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [accountFilter, setAccountFilter] = useState<string>(ALL);

  const accById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const ccyById = useMemo(() => new Map(currencies.map((c) => [c.id, c.code])), [currencies]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const typeByKey = useMemo(() => new Map(types.map((t) => [t.key, t])), [types]);

  const filteredSorted = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (typeFilter !== ALL && r.type !== typeFilter) return false;
      if (accountFilter !== ALL) {
        if (r.fromAccountId !== accountFilter && r.toAccountId !== accountFilter) return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "date_desc" || sort === "date_asc") {
        const cmp = (a.occurredOn ?? "").localeCompare(b.occurredOn ?? "");
        return sort === "date_desc" ? -cmp : cmp;
      }
      const av = Number(a.eurAmount ?? 0);
      const bv = Number(b.eurAmount ?? 0);
      return sort === "amount_desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [rows, typeFilter, accountFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Sort</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date ↓ (newest)</SelectItem>
              <SelectItem value="date_asc">Date ↑ (oldest)</SelectItem>
              <SelectItem value="amount_desc">Amount ↓ (highest)</SelectItem>
              <SelectItem value="amount_asc">Amount ↑ (lowest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {types.map((t) => {
                const s = colorStyle(t.color);
                return (
                  <SelectItem key={t.id} value={t.key}>
                    <span className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${s.swatch}`} />
                      {t.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account</Label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredSorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nema transakcija.</p>
      ) : (
        <ul className="space-y-2">
          {filteredSorted.map((r) => {
            const from = r.fromAccountId ? accById.get(r.fromAccountId)?.name : null;
            const to = r.toAccountId ? accById.get(r.toAccountId)?.name : null;
            const cat = r.categoryId ? catById.get(r.categoryId) : null;
            const outflow = fmtAmount(r.outflowAmount, r.outflowCurrencyId ? ccyById.get(r.outflowCurrencyId) : undefined);
            const inflow = fmtAmount(r.inflowAmount, r.inflowCurrencyId ? ccyById.get(r.inflowCurrencyId) : undefined);
            const type = typeByKey.get(r.type);
            const tStyle = colorStyle(type?.color);
            return (
              <li key={r.id}>
                <Link href={`/finance/transactions/${r.id}`}>
                  <Card className="px-4 py-3 hover:bg-accent">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium truncate">
                          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs ${tStyle.badge}`}>
                            {type?.label ?? r.type}
                          </span>
                          {cat ? <span className="text-muted-foreground truncate">{cat}</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.occurredOn}
                          {from || to ? (
                            <>
                              {" · "}
                              {from ?? "—"} → {to ?? "—"}
                            </>
                          ) : null}
                        </div>
                        {r.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        {outflow && <div className="text-rose-600">- {outflow}</div>}
                        {inflow && <div className="text-emerald-600">+ {inflow}</div>}
                        {r.eurAmount && (
                          <div className="text-muted-foreground">
                            ≈ {Number(r.eurAmount).toLocaleString("sr-RS", { maximumFractionDigits: 2 })} EUR
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
