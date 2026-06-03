"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRANSACTION_TYPE_COLORS,
  categoryKindEnum,
  type CategoryKind,
  type TransactionTypeColor,
  type TransactionTypeRow,
} from "@/db/schema/finance";
import {
  addTransactionType,
  removeTransactionType,
  updateTransactionType,
} from "../_actions/transactionTypes";
import { colorStyle } from "@/lib/finance/colors";

const NONE = "__none__";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function TransactionTypeEditor({ types }: { types: TransactionTypeRow[] }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<TransactionTypeColor>("gray");
  const [pending, startTransition] = useTransition();

  function submit() {
    const key = slugify(label);
    if (!key) {
      toast.error("Label nije validan");
      return;
    }
    startTransition(async () => {
      const r = await addTransactionType({
        key,
        label: label.trim(),
        color,
        sortOrder: types.length,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLabel("");
      setColor("gray");
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">Tipovi transakcije</h3>
        <p className="text-xs text-muted-foreground">
          Boja, kategorija (kind) i koja polja su vidljiva na formi.
        </p>
      </div>

      <ul className="space-y-2">
        {types.map((t) => (
          <Row key={t.id} type={t} pending={pending} startTransition={startTransition} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="New type label (npr. Donacija)"
          className="max-w-xs"
        />
        <Select value={color} onValueChange={(v) => setColor(v as TransactionTypeColor)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPE_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${colorStyle(c).swatch}`} />
                  {colorStyle(c).label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit} disabled={pending || !label.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  );
}

function Row({
  type,
  pending,
  startTransition,
}: {
  type: TransactionTypeRow;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  function patch(values: Parameters<typeof updateTransactionType>[0]) {
    startTransition(async () => {
      const r = await updateTransactionType(values);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    if (!confirm(`Remove type "${type.label}"?`)) return;
    startTransition(async () => {
      const r = await removeTransactionType(type.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  const style = colorStyle(type.color);

  return (
    <li className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${style.badge}`}
        >
          {type.label}
        </span>
        <Input
          defaultValue={type.label}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== type.label) patch({ id: type.id, label: v });
          }}
          className="flex-1 min-w-0"
        />
        <Select
          value={type.color}
          onValueChange={(v) => patch({ id: type.id, color: v as TransactionTypeColor })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPE_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${colorStyle(c).swatch}`} />
                  {colorStyle(c).label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type.categoryKind ?? NONE}
          onValueChange={(v) =>
            patch({ id: type.id, categoryKind: v === NONE ? null : (v as CategoryKind) })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No category</SelectItem>
            {categoryKindEnum.enumValues.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 pl-1 text-xs text-muted-foreground">
        <Toggle
          label="from"
          checked={type.showsFrom}
          onChange={(v) => patch({ id: type.id, showsFrom: v })}
        />
        <Toggle
          label="to"
          checked={type.showsTo}
          onChange={(v) => patch({ id: type.id, showsTo: v })}
        />
        <Toggle
          label="outflow"
          checked={type.showsOutflow}
          onChange={(v) => patch({ id: type.id, showsOutflow: v })}
        />
        <Toggle
          label="inflow"
          checked={type.showsInflow}
          onChange={(v) => patch({ id: type.id, showsInflow: v })}
        />
        <span className="opacity-60">key: {type.key}</span>
      </div>
    </li>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}
