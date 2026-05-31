"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addExercise, archiveExercise, updateExercise } from "../_actions/exercises";
import type { Category, Exercise } from "@/db/schema/physical";

const NO_CATEGORY = "__none__";

export function ExerciseEditor({
  modalityId,
  categories,
  exercises,
}: {
  modalityId: string;
  categories: Category[];
  exercises: Exercise[];
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addExercise({
        modalityId,
        name,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
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

  function setCategory(ex: Exercise, value: string) {
    startTransition(async () => {
      const result = await updateExercise({
        id: ex.id,
        categoryId: value === NO_CATEGORY ? null : value,
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

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {exercises.map((ex) => (
          <li key={ex.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input
              defaultValue={ex.name}
              onBlur={(e) => {
                if (e.target.value !== ex.name) rename(ex, e.target.value);
              }}
              className="max-w-xs"
            />
            <Select value={ex.categoryId ?? NO_CATEGORY} onValueChange={(v) => setCategory(ex, v)}>
              <SelectTrigger className="max-w-[10rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => archive(ex)} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New exercise" className="max-w-xs" />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="max-w-[10rem]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>No category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
