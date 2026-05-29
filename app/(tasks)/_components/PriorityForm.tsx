"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createPriority } from "../_actions/priorities";
import { ColorPicker } from "./ColorPicker";

export function PriorityForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [rank, setRank] = useState<string>("1000");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const rankNum = Number(rank);
    startTransition(async () => {
      const r = await createPriority({
        name: trimmed,
        color,
        rank: Number.isFinite(rankNum) ? rankNum : undefined,
      });
      if (r.ok) {
        setName("");
        setColor(null);
        setRank("1000");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="space-y-1">
        <Label htmlFor="prio-name" className="text-xs">Name</Label>
        <Input
          id="prio-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Priority name"
          disabled={pending}
          className="max-w-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="prio-rank" className="text-xs">Rank (lower = higher)</Label>
        <Input
          id="prio-rank"
          type="number"
          min={0}
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          disabled={pending}
          className="w-28"
        />
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <Button type="submit" disabled={pending || !name.trim()}>
        Add priority
      </Button>
    </form>
  );
}
