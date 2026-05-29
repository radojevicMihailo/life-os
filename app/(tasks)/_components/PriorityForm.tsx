"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPriority } from "../_actions/priorities";
import { ColorPicker } from "./ColorPicker";

export function PriorityForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createPriority({ name: trimmed, color });
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
        placeholder="Priority name"
        disabled={pending}
        className="max-w-xs"
      />
      <ColorPicker value={color} onChange={setColor} />
      <Button type="submit" disabled={pending || !name.trim()}>
        Add priority
      </Button>
    </form>
  );
}
