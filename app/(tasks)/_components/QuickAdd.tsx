"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { createTask } from "../_actions/tasks";

export function QuickAdd() {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createTask({ title: trimmed });
      if (result.ok) {
        setTitle("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full max-w-xl gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter"
        disabled={pending}
        autoFocus
      />
    </form>
  );
}
