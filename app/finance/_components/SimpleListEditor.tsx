"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export type SimpleItem = { id: string; label: string };

type Props = {
  title: string;
  hint?: string;
  items: SimpleItem[];
  placeholder: string;
  itemColumns?: 1 | 2 | 3;
  onAdd: (label: string, sortOrder: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRename: (id: string, label: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemove: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  confirmRemove?: (label: string) => string;
};

export function SimpleListEditor({
  title,
  hint,
  items,
  placeholder,
  itemColumns = 1,
  onAdd,
  onRename,
  onRemove,
  confirmRemove,
}: Props) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await onAdd(value, items.length);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setValue("");
    });
  }

  function rename(item: SimpleItem, next: string) {
    if (next === item.label) return;
    startTransition(async () => {
      const r = await onRename(item.id, next);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(item: SimpleItem) {
    const msg = confirmRemove ? confirmRemove(item.label) : `Remove "${item.label}"?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const r = await onRemove(item.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <ul
        className={
          itemColumns === 3
            ? "grid grid-cols-1 gap-2 md:grid-cols-3"
            : itemColumns === 2
              ? "grid grid-cols-1 gap-2 md:grid-cols-2"
              : "space-y-2"
        }
      >
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <Input
              defaultValue={it.label}
              onBlur={(e) => rename(it, e.target.value.trim())}
              className="flex-1 min-w-0"
            />
            <Button size="icon" variant="ghost" onClick={() => remove(it)} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0"
        />
        <Button size="sm" onClick={submit} disabled={pending || !value.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  );
}
