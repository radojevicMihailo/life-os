"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mealTimeToIso } from "@/lib/meals/time";
import { createMeal } from "../_actions/meals";
import { FoodPicker, type PickedFood } from "./FoodPicker";
import { MealItemRow, type DraftItem } from "./MealItemRow";

export function AddMealDialog({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setName("");
    setTime("");
    setItems([]);
    setError(null);
  }

  function addPick(p: PickedFood) {
    setItems((cur) => [
      ...cur,
      {
        foodId: p.id,
        name: p.name,
        brand: p.brand,
        kcalPer100g: p.kcalPer100g,
        proteinPer100g: p.proteinPer100g,
        carbsPer100g: p.carbsPer100g,
        fatPer100g: p.fatPer100g,
        grams: 100,
      },
    ]);
  }

  function submit() {
    setError(null);
    start(async () => {
      const eatenAt = mealTimeToIso(date, time);
      const res = await createMeal({
        date,
        name: name.trim(),
        eatenAt,
        notes: null,
        items: items.map((i) => ({ foodId: i.foodId!, grams: i.grams })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const totals = items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + (i.kcalPer100g * i.grams) / 100,
      protein: acc.protein + (i.proteinPer100g * i.grams) / 100,
      carbs: acc.carbs + (i.carbsPer100g * i.grams) / 100,
      fat: acc.fat + (i.fatPer100g * i.grams) / 100,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add meal</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Time (optional)</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-background/30 p-4">
            {items.map((it, idx) => (
              <MealItemRow
                key={idx}
                item={it}
                onChange={(next) =>
                  setItems((cur) => cur.map((x, i) => (i === idx ? next : x)))
                }
                onRemove={() =>
                  setItems((cur) => cur.filter((_, i) => i !== idx))
                }
              />
            ))}
          </div>
          <div className="space-y-2"><Label>Dodaj namirnicu</Label><FoodPicker onPick={addPick} /></div>
          <div className="text-sm text-muted-foreground">
            Total: {Math.round(totals.kcal)} kcal · P{totals.protein.toFixed(1)}
            · C{totals.carbs.toFixed(1)} · F{totals.fat.toFixed(1)}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending || items.length === 0 || !name.trim()}
          >
            {pending ? "Saving…" : "Save meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
