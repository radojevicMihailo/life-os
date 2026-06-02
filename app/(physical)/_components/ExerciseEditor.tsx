"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addExercise, archiveExercise, updateExercise } from "../_actions/exercises";
import type { Exercise, ExerciseGroup } from "@/db/schema/physical";

const NO_GROUP = "__none__";

export function ExerciseEditor({
  groups,
  exercises,
}: {
  groups: ExerciseGroup[];
  exercises: Exercise[];
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(NO_GROUP);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addExercise({
        name,
        groupId: groupId === NO_GROUP ? null : groupId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
    });
  }

  function rename(ex: Exercise, value: string) {
    startTransition(async () => {
      const result = await updateExercise({ id: ex.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function setGroup(ex: Exercise, value: string) {
    startTransition(async () => {
      const result = await updateExercise({
        id: ex.id,
        groupId: value === NO_GROUP ? null : value,
      });
      if (!result.ok) toast.error(result.error);
    });
  }

  function archive(ex: Exercise) {
    if (!confirm(`Archive "${ex.name}"? It hides from selectors but past entries keep it.`)) return;
    startTransition(async () => {
      const result = await archiveExercise(ex.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  const byGroup = new Map<string | null, Exercise[]>();
  for (const ex of exercises) {
    const key = ex.groupId ?? null;
    const list = byGroup.get(key) ?? [];
    list.push(ex);
    byGroup.set(key, list);
  }
  const sections: { id: string | null; name: string; items: Exercise[] }[] = [
    ...groups
      .map((g) => ({ id: g.id, name: g.name, items: byGroup.get(g.id) ?? [] }))
      .filter((s) => s.items.length > 0),
  ];
  const ungrouped = byGroup.get(null) ?? [];
  if (ungrouped.length > 0) sections.push({ id: null, name: "Ungrouped", items: ungrouped });

  function renderRow(ex: Exercise) {
    return (
      <li key={ex.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Input
          defaultValue={ex.name}
          onBlur={(e) => {
            if (e.target.value !== ex.name) rename(ex, e.target.value);
          }}
          className="flex-1 min-w-0"
        />
        <Select value={ex.groupId ?? NO_GROUP} onValueChange={(v) => setGroup(ex, v)}>
          <SelectTrigger className="max-w-[10rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GROUP}>No group</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" onClick={() => archive(ex)} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.id ?? "__none__"} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{s.name}</h3>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">{s.items.map(renderRow)}</ul>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New exercise" className="max-w-xs" />
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="max-w-[10rem]"><SelectValue placeholder="Group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GROUP}>No group</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add exercise
        </Button>
      </div>
    </div>
  );
}
