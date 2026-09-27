"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DraftItem = {
  foodId: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  grams: number;
};

export function MealItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  onChange: (next: DraftItem) => void;
  onRemove: () => void;
}) {
  const factor = item.grams / 100;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-40 flex-1">
        <div className="font-medium text-base">{item.name}</div>
        <div className="text-sm text-muted-foreground">
          {Math.round(item.kcalPer100g * factor)} kcal · P
          {(item.proteinPer100g * factor).toFixed(1)} · C
          {(item.carbsPer100g * factor).toFixed(1)} · F
          {(item.fatPer100g * factor).toFixed(1)}
        </div>
      </div>
      <Input
        type="number"
        step="1"
        min="0"
        aria-label={`Grami za ${item.name}`}
        className="w-28"
        value={item.grams}
        onChange={(e) =>
          onChange({ ...item, grams: Number(e.target.value) || 0 })
        }
      />
      <span className="text-sm">g</span>
      <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}
