"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTask } from "../_actions/tasks";

export function SubtaskAdd({ parentTaskId }: { parentTaskId: string }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createTask({ title: trimmed, parentTaskId });
      if (!r.ok) toast.error(r.error);
      else setTitle("");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add subtask"
        disabled={pending}
      />
      <Button type="submit" disabled={pending || !title.trim()} size="sm">
        Add
      </Button>
    </form>
  );
}
