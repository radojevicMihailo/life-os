"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchOffFoods, importOffFood } from "../_actions/search";
import { searchLibraryFoods, type LibraryFoodHit } from "../_actions/foods-search";

export type PickedFood = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function FoodPicker({ onPick }: { onPick: (f: PickedFood) => void }) {
  const [q, setQ] = useState("");
  const [lib, setLib] = useState<LibraryFoodHit[]>([]);
  const [off, setOff] = useState<
    { offId: string; name: string; brand: string | null; kcalPer100g: number }[]
  >([]);
  const [offError, setOffError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const handle = setTimeout(() => {
      start(async () => {
        const res = await searchLibraryFoods(term);
        if (res.ok) setLib(res.data);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const showLib = q.trim().length >= 2 && lib.length > 0;

  function offSearch() {
    setOffError(null);
    start(async () => {
      const res = await searchOffFoods(q.trim());
      if (!res.ok) {
        setOffError(res.error);
        setOff([]);
        return;
      }
      setOff(
        res.data.map((p) => ({
          offId: p.offId,
          name: p.name,
          brand: p.brand,
          kcalPer100g: p.kcalPer100g,
        })),
      );
    });
  }

  function pickLib(hit: LibraryFoodHit) {
    onPick(hit);
    setQ("");
    setLib([]);
    setOff([]);
  }

  function pickOff(offId: string) {
    start(async () => {
      const res = await importOffFood(offId);
      if (!res.ok) {
        setOffError(res.error);
        return;
      }
      pickLib(res.data);
    });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search food…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {showLib && (
        <ul className="border rounded divide-y max-h-56 overflow-auto">
          {lib.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="w-full text-left p-2 hover:bg-muted"
                onClick={() => pickLib(f)}
              >
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {f.brand ? `${f.brand} · ` : ""}
                  {f.kcalPer100g} kcal / 100g
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={offSearch}
            disabled={pending}
          >
            Search OpenFoodFacts
          </Button>
          {offError && <span className="text-red-600">{offError}</span>}
        </div>
      )}
      {off.length > 0 && (
        <ul className="border rounded divide-y max-h-56 overflow-auto">
          {off.map((p) => (
            <li key={p.offId}>
              <button
                type="button"
                className="w-full text-left p-2 hover:bg-muted"
                onClick={() => pickOff(p.offId)}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.brand ? `${p.brand} · ` : ""}
                  {p.kcalPer100g} kcal / 100g · OFF
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
