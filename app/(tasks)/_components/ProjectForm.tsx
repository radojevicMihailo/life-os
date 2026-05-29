"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProject } from "../_actions/projects";

export function ProjectForm() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createProject({ name: trimmed });
      if (r.ok) setName("");
      else toast.error(r.error);
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
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project name"
        disabled={pending}
        className="max-w-sm"
      />
      <Button type="submit" disabled={pending || !name.trim()}>
        Add project
      </Button>
    </form>
  );
}
