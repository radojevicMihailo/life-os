"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { createMilestone } from "../_actions/milestones";

export function MilestoneAdd({ goalId }: { goalId: string }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createMilestone({ goalId, title: trimmed });
      if (r.ok) setTitle("");
      else toast.error(r.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full max-w-xl items-center gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add milestone and press Enter"
        disabled={pending}
      />
    </form>
  );
}
