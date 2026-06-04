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
import { updateMeal, deleteMeal } from "../_actions/meals";
import { FoodPicker, type PickedFood } from "./FoodPicker";
import { MealItemRow, type DraftItem } from "./MealItemRow";

export type EditMealInitial = {
  id: string;
  date: string;
  name: string;
  time: string;
  items: DraftItem[];
};

export function EditMealDialog({
  initial,
  trigger,
}: {
  initial: EditMealInitial;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [time, setTime] = useState(initial.time);
  const [items, setItems] = useState<DraftItem[]>(initial.items);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

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
      const eatenAt =
        time && /^\d{2}:\d{2}$/.test(time)
          ? new Date(`${initial.date}T${time}:00`).toISOString()
          : null;
      const res = await updateMeal({
        id: initial.id,
        date: initial.date,
        name: name.trim(),
        eatenAt,
        notes: null,
        items: items.map((i) => ({ foodId: i.foodId, grams: i.grams })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      await deleteMeal(initial.id, initial.date);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-2">
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
          <FoodPicker onPick={addPick} />
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
          <Button onClick={submit} disabled={pending || items.length === 0}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
