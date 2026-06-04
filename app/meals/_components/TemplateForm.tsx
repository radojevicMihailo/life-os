"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTemplate, updateTemplate, deleteTemplate } from "../_actions/templates";
import { FoodPicker, type PickedFood } from "./FoodPicker";
import { MealItemRow, type DraftItem } from "./MealItemRow";

type Mode = { kind: "create" } | { kind: "edit"; id: string };

export function TemplateForm({
  mode,
  initialName,
  initialItems,
}: {
  mode: Mode;
  initialName: string;
  initialItems: DraftItem[];
}) {
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState<DraftItem[]>(initialItems);
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
      const payload = {
        name: name.trim(),
        items: items.map((i) => ({ foodId: i.foodId, grams: i.grams })),
      };
      const res =
        mode.kind === "create"
          ? await createTemplate(payload)
          : await updateTemplate({ id: mode.id, ...payload });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/meals/templates");
      router.refresh();
    });
  }

  function remove() {
    if (mode.kind !== "edit") return;
    start(async () => {
      await deleteTemplate(mode.id);
      router.push("/meals/templates");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 max-w-md">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <MealItemRow
            key={idx}
            item={it}
            onChange={(next) =>
              setItems((cur) => cur.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
          />
        ))}
      </div>
      <FoodPicker onPick={addPick} />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || items.length === 0 || !name.trim()}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {mode.kind === "edit" && (
          <Button variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
