"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMealTargets } from "../_actions/settings";

type Targets = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

const FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "kcal", label: "Daily kcal", unit: "kcal" },
  { key: "protein", label: "Daily protein", unit: "g" },
  { key: "carbs", label: "Daily carbs", unit: "g" },
  { key: "fat", label: "Daily fat", unit: "g" },
];

export function TargetsForm({ initial }: { initial: Targets }) {
  const [v, setV] = useState<Record<keyof Targets, string>>({
    kcal: initial.kcal?.toString() ?? "",
    protein: initial.protein?.toString() ?? "",
    carbs: initial.carbs?.toString() ?? "",
    fat: initial.fat?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    start(async () => {
      const payload: Targets = {
        kcal: v.kcal.trim() === "" ? null : Number(v.kcal),
        protein: v.protein.trim() === "" ? null : Number(v.protein),
        carbs: v.carbs.trim() === "" ? null : Number(v.carbs),
        fat: v.fat.trim() === "" ? null : Number(v.fat),
      };
      const res = await saveMealTargets(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/meals");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-3 max-w-sm"
    >
      <p className="text-sm text-muted-foreground">
        Leave blank to disable a target.
      </p>
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label>
            {f.label} ({f.unit})
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={v[f.key]}
            onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
          />
        </div>
      ))}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
