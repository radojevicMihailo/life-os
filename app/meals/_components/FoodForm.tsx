"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFood, updateFood } from "../_actions/foods";

type Mode = { kind: "create" } | { kind: "edit"; id: string };

type Initial = {
  name: string;
  brand: string;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
};

export function FoodForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial: Initial;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    start(async () => {
      const payload = {
        name: v.name,
        brand: v.brand || null,
        kcalPer100g: Number(v.kcalPer100g) || 0,
        proteinPer100g: Number(v.proteinPer100g) || 0,
        carbsPer100g: Number(v.carbsPer100g) || 0,
        fatPer100g: Number(v.fatPer100g) || 0,
        source: "manual" as const,
        offId: null,
      };
      const res =
        mode.kind === "create"
          ? await createFood(payload)
          : await updateFood({ id: mode.id, ...payload });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/meals/library");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-3 max-w-md"
    >
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Brand (optional)</Label>
        <Input value={v.brand} onChange={(e) => setV({ ...v, brand: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { k: "kcalPer100g", label: "kcal / 100g" },
          { k: "proteinPer100g", label: "Protein g / 100g" },
          { k: "carbsPer100g", label: "Carbs g / 100g" },
          { k: "fatPer100g", label: "Fat g / 100g" },
        ].map((f) => (
          <div key={f.k} className="space-y-1">
            <Label>{f.label}</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={v[f.k as keyof Initial]}
              onChange={(e) =>
                setV({ ...v, [f.k]: e.target.value } as Initial)
              }
            />
          </div>
        ))}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
