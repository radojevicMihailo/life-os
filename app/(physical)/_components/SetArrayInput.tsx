"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SetEntry } from "@/db/schema/physical";

export function SetArrayInput({
  value,
  onChange,
}: {
  value: SetEntry[];
  onChange: (next: SetEntry[]) => void;
}) {
  function update(index: number, patch: Partial<SetEntry>) {
    const next = value.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { weight: 0, reps: 0 }]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sets.</p>
      ) : (
        <div className="grid grid-cols-[auto_auto_1fr_1fr_auto] items-end gap-2">
          <Label className="text-xs">#</Label>
          <Label className="text-xs">BW</Label>
          <Label className="text-xs">Weight</Label>
          <Label className="text-xs">Reps</Label>
          <span />
          {value.map((s, i) => {
            const bw = s.bodyweight === true;
            return (
              <div key={i} className="contents">
                <div className="flex h-9 items-center text-sm text-muted-foreground">{i + 1}</div>
                <div className="flex h-9 items-center justify-center">
                  <Checkbox
                    checked={bw}
                    onCheckedChange={(c) => update(i, { bodyweight: c === true })}
                  />
                </div>
                <Input
                  type="number"
                  step="0.5"
                  value={s.weight === 0 ? "" : s.weight}
                  placeholder={bw ? "+ added" : "0"}
                  onChange={(e) => update(i, { weight: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="1"
                  value={s.reps === 0 ? "" : s.reps}
                  placeholder="0"
                  onChange={(e) => update(i, { reps: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
                <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="mr-2 h-4 w-4" /> Add set
      </Button>
    </div>
  );
}
