"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Exercise } from "@/db/schema/physical";
import {
  archiveWorkoutPlan,
  createWorkoutPlan,
  deleteWorkoutPlan,
  updateWorkoutPlan,
} from "../_actions/workoutPlans";

type ExerciseRow = {
  exerciseId: string | null;
  setCount: number;
  sortOrder: number;
  linkNext: boolean;
};

export type WorkoutPlanInitial = {
  id?: string;
  name: string;
  notes: string | null;
  exercises: ExerciseRow[];
  archivedAt?: Date | null;
};

export function WorkoutPlanForm({
  exercises,
  initial,
}: {
  exercises: Exercise[];
  initial?: WorkoutPlanInitial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(initial?.exercises ?? []);
  const [pending, startTransition] = useTransition();

  function setRow(idx: number, patch: Partial<ExerciseRow>) {
    setRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function add() {
    setRows((prev) => [
      ...prev,
      { exerciseId: null, setCount: 3, sortOrder: prev.length, linkNext: false },
    ]);
  }

  function toggleLink(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, linkNext: !r.linkNext } : r)));
  }

  function remove(idx: number) {
    setRows((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      const last = filtered.length - 1;
      return filtered.map((r, i) => ({
        ...r,
        sortOrder: i,
        linkNext: i === last ? false : r.linkNext,
      }));
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= rows.length) return;
    setRows((prev) => {
      const out = prev.slice();
      [out[idx], out[next]] = [out[next], out[idx]];
      return out.map((r, i) => ({ ...r, sortOrder: i }));
    });
  }

  function submit() {
    const payload = {
      name,
      notes: notes.trim() === "" ? null : notes,
      exercises: rows
        .filter((r) => r.exerciseId)
        .map((r, i, arr) => ({
          exerciseId: r.exerciseId as string,
          setCount: r.setCount,
          sortOrder: i,
          linkNext: i === arr.length - 1 ? false : r.linkNext,
        })),
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updateWorkoutPlan(initial.id, payload)
        : await createWorkoutPlan(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Workout plan updated" : "Workout plan created");
      router.push("/plans/workouts");
    });
  }

  function archive() {
    if (!initial?.id) return;
    if (!confirm("Archive this workout plan?")) return;
    startTransition(async () => {
      const result = await archiveWorkoutPlan(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Archived");
      router.push("/plans/workouts");
    });
  }

  function destroy() {
    if (!initial?.id) return;
    if (!confirm("Delete this workout plan? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteWorkoutPlan(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      router.push("/plans/workouts");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day A" />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Goal, intent, references…"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Exercises</Label>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-2 h-4 w-4" /> Add exercise
          </Button>
        </div>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No exercises.</p> : null}
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const inSuperset = row.linkNext || (idx > 0 && rows[idx - 1].linkNext);
          return (
          <div key={idx} className="space-y-0">
          <div
            className={`rounded-md border p-3 space-y-3 ${
              inSuperset ? "border-primary/40 bg-primary/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                {inSuperset ? (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    Superset
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(idx, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move(idx, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label>Exercise</Label>
                <Select
                  value={row.exerciseId ?? ""}
                  onValueChange={(v) => setRow(idx, { exerciseId: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="Pick exercise" /></SelectTrigger>
                  <SelectContent>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Working sets</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={row.setCount}
                  onChange={(e) =>
                    setRow(idx, { setCount: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
            </div>
          </div>
          {!isLast ? (
            <div className="flex justify-center py-1">
              <Button
                size="sm"
                variant={row.linkNext ? "secondary" : "ghost"}
                onClick={() => toggleLink(idx)}
                className="h-7 gap-1.5 text-xs"
              >
                {row.linkNext ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                {row.linkNext ? "Superset" : "Link as superset"}
              </Button>
            </div>
          ) : null}
          </div>
          );
        })}
        {rows.length > 0 ? (
          <Button size="sm" variant="outline" onClick={add} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add exercise
          </Button>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        {initial?.id ? (
          <>
            <Button variant="ghost" onClick={destroy} disabled={pending} className="text-destructive">
              Delete
            </Button>
            <Button variant="ghost" onClick={archive} disabled={pending}>
              Archive
            </Button>
          </>
        ) : null}
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button onClick={submit} disabled={pending || !name.trim()}>
          {initial?.id ? "Save" : "Create plan"}
        </Button>
      </div>
    </div>
  );
}
