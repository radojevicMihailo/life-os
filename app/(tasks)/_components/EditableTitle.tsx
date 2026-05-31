"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProject } from "../_actions/projects";
import { updateTask } from "../_actions/tasks";

type Props = {
  id: string;
  value: string;
  kind: "project" | "task";
};

export function EditableTitle({ id, value, kind }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r =
        kind === "project"
          ? await updateProject({ id, name: trimmed })
          : await updateTask({ id, title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setDraft(value);
      }
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="h-10 max-w-xl text-2xl font-semibold tracking-tight"
        />
        <Button size="icon" variant="ghost" onClick={save} disabled={pending}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={cancel} disabled={pending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{value}</h1>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setEditing(true)}
        className="opacity-0 transition group-hover:opacity-100"
        aria-label="Rename"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
