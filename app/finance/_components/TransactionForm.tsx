"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { saveTransaction, deleteTransaction } from "../_actions/transactions";
import { colorStyle } from "@/lib/finance/colors";

const NONE = "__none__";

type Props = {
  transaction?: Transaction;
  types: TransactionTypeRow[];
  accounts: Account[];
  currencies: Currency[];
  categories: TransactionCategory[];
};

export function TransactionForm({
  transaction,
  types,
  accounts,
  currencies,
  categories,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const defaultTypeKey =
    transaction?.type ?? types.find((t) => t.key === "trosak")?.key ?? types[0]?.key ?? "";

  const [occurredOn, setOccurredOn] = useState(
    transaction?.occurredOn ?? new Date().toISOString().slice(0, 10),
  );
  const [typeKey, setTypeKey] = useState<string>(defaultTypeKey);
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? NONE);
  const [fromAccountId, setFromAccountId] = useState<string>(transaction?.fromAccountId ?? NONE);
  const [toAccountId, setToAccountId] = useState<string>(transaction?.toAccountId ?? NONE);
  const [outflowAmount, setOutflowAmount] = useState(transaction?.outflowAmount?.toString() ?? "");
  const [outflowCurrencyId, setOutflowCurrencyId] = useState<string>(
    transaction?.outflowCurrencyId ?? NONE,
  );
  const [inflowAmount, setInflowAmount] = useState(transaction?.inflowAmount?.toString() ?? "");
  const [inflowCurrencyId, setInflowCurrencyId] = useState<string>(
    transaction?.inflowCurrencyId ?? NONE,
  );

  const currentType = useMemo(
    () => types.find((t) => t.key === typeKey) ?? null,
    [types, typeKey],
  );

  const visibleCategories = useMemo(() => {
    const kind = currentType?.categoryKind ?? null;
    if (!kind) return [] as TransactionCategory[];
    return categories.filter((c) => c.kind === kind);
  }, [currentType, categories]);

  function syncDefaultsForType(nextKey: string) {
    const next = types.find((t) => t.key === nextKey);
    setTypeKey(nextKey);
    setCategoryId(NONE);
    if (!next) return;
    if (!next.showsFrom) setFromAccountId(NONE);
    if (!next.showsTo) setToAccountId(NONE);
    if (!next.showsOutflow) {
      setOutflowAmount("");
      setOutflowCurrencyId(NONE);
    }
    if (!next.showsInflow) {
      setInflowAmount("");
      setInflowCurrencyId(NONE);
    }
  }

  function pickFromAccount(id: string) {
    setFromAccountId(id);
    if (id === NONE) return;
    const acc = accounts.find((a) => a.id === id);
    if (acc?.currencyId && outflowCurrencyId === NONE) setOutflowCurrencyId(acc.currencyId);
  }

  function pickToAccount(id: string) {
    setToAccountId(id);
    if (id === NONE) return;
    const acc = accounts.find((a) => a.id === id);
    if (acc?.currencyId && inflowCurrencyId === NONE) setInflowCurrencyId(acc.currencyId);
  }

  function submit() {
    if (!typeKey) {
      toast.error("Nema definisanog tipa");
      return;
    }
    startTransition(async () => {
      const result = await saveTransaction({
        id: transaction?.id,
        occurredOn,
        type: typeKey,
        description: description.trim() || null,
        categoryId: categoryId === NONE ? null : categoryId,
        fromAccountId: fromAccountId === NONE ? null : fromAccountId,
        toAccountId: toAccountId === NONE ? null : toAccountId,
        outflowAmount: outflowAmount.trim() === "" ? null : outflowAmount,
        outflowCurrencyId: outflowCurrencyId === NONE ? null : outflowCurrencyId,
        inflowAmount: inflowAmount.trim() === "" ? null : inflowAmount,
        inflowCurrencyId: inflowCurrencyId === NONE ? null : inflowCurrencyId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
      router.push("/finance/transactions");
      router.refresh();
    });
  }

  function remove() {
    if (!transaction) return;
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      const r = await deleteTransaction(transaction.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Deleted");
      router.push("/finance/transactions");
      router.refresh();
    });
  }

  const typeStyle = colorStyle(currentType?.color);
  const showsFrom = currentType?.showsFrom ?? true;
  const showsTo = currentType?.showsTo ?? true;
  const showsOutflow = currentType?.showsOutflow ?? true;
  const showsInflow = currentType?.showsInflow ?? true;
  const showCategory = currentType?.categoryKind != null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Datum</Label>
          <Input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Tip transakcije</Label>
          <Select value={typeKey} onValueChange={syncDefaultsForType}>
            <SelectTrigger className={`w-full ${typeStyle.trigger}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
      </div>

      <div className="space-y-2">
        <Label>Opis</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Slobodan tekst"
          rows={2}
        />
      </div>

      {showCategory && (
        <div className="space-y-2">
          <Label>Kategorija</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {visibleCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(showsFrom || showsOutflow) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {showsFrom && (
            <div className="space-y-2 md:col-span-3">
              <Label>Sa računa</Label>
              <Select value={fromAccountId} onValueChange={pickFromAccount}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showsOutflow && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label>Outflow iznos</Label>
                <Input
                  type="number"
                  step="any"
                  value={outflowAmount}
                  onChange={(e) => setOutflowAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Valuta</Label>
                <Select value={outflowCurrencyId} onValueChange={setOutflowCurrencyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {currencies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {(showsTo || showsInflow) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {showsTo && (
            <div className="space-y-2 md:col-span-3">
              <Label>Na račun</Label>
              <Select value={toAccountId} onValueChange={pickToAccount}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showsInflow && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label>Inflow iznos</Label>
                <Input
                  type="number"
                  step="any"
                  value={inflowAmount}
                  onChange={(e) => setInflowAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Valuta</Label>
                <Select value={inflowCurrencyId} onValueChange={setInflowCurrencyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {currencies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {transaction && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <div>
            EUR rate: {transaction.eurRate ?? "—"} · EUR amount: {transaction.eurAmount ?? "—"}
          </div>
          <div>
            USD rate: {transaction.usdRate ?? "—"} · USD amount: {transaction.usdAmount ?? "—"}
          </div>
          <div className="text-[10px]">Auto-popunjava se pri snimanju iz inflow-a (ili outflow-a).</div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button onClick={submit} disabled={pending}>
            {transaction ? "Save" : "Create"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/finance/transactions")}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
        {transaction && (
          <Button variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
