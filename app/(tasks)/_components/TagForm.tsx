"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTag } from "../_actions/tags";

const presetColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export function TagForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createTag({ name: trimmed, color });
      if (r.ok) {
        setName("");
        setColor(null);
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
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New tag name"
        disabled={pending}
        className="max-w-xs"
      />
      <div className="flex items-center gap-1">
        {presetColors.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(color === c ? null : c)}
            style={{ backgroundColor: c }}
            aria-label={`color ${c}`}
            className={`h-6 w-6 rounded-full border-2 ${
              color === c ? "border-foreground" : "border-transparent"
            }`}
          />
        ))}
      </div>
      <Button type="submit" disabled={pending || !name.trim()}>
        Add tag
      </Button>
    </form>
  );
}
