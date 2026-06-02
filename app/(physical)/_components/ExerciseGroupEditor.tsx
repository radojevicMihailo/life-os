"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addExerciseGroup,
  removeExerciseGroup,
  renameExerciseGroup,
} from "../_actions/exerciseGroups";
import type { ExerciseGroup } from "@/db/schema/physical";

export function ExerciseGroupEditor({ groups }: { groups: ExerciseGroup[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addExerciseGroup({ name, sortOrder: groups.length });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
    });
  }

  function rename(g: ExerciseGroup, value: string) {
    startTransition(async () => {
      const result = await renameExerciseGroup({ id: g.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(g: ExerciseGroup) {
    if (!confirm(`Remove group "${g.name}"? Exercises in this group lose their group.`)) return;
    startTransition(async () => {
      const result = await removeExerciseGroup(g.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {groups.map((g) => (
          <li key={g.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input
              defaultValue={g.name}
              onBlur={(e) => {
                if (e.target.value !== g.name) rename(g, e.target.value);
              }}
              className="flex-1"
            />
            <Button size="icon" variant="ghost" onClick={() => remove(g)} disabled={pending} className="ml-auto">
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New group"
          className="max-w-xs"
        />
        <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add group
        </Button>
      </div>
    </div>
  );
}
