"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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
import { mmSsToSeconds, secondsToMmSs } from "@/lib/physical/formatDuration";
import { computePace } from "@/lib/physical/pace";
import {
  type Category,
  type Exercise,
  type PhysicalField,
  type SetEntry,
} from "@/db/schema/physical";
import { SetArrayInput } from "./SetArrayInput";
import { createActivity, deleteActivity, updateActivity } from "../_actions/activities";

type ValueMap = Record<string, unknown>;
type SubrowState = {
  exerciseId: string | null;
  values: ValueMap;
  sortOrder: number;
};

export type ActivityInitial = {
  id?: string;
  performedAt: Date;
  values: ValueMap;
  comment: string | null;
  subrows: SubrowState[];
};

const EXERCISE_NONE = "__none__";

function emptyValues(fields: PhysicalField[]): ValueMap {
  const out: ValueMap = {};
  for (const f of fields) {
    if (f.kind === "sets_array") out[f.key] = [];
    else out[f.key] = null;
  }
  return out;
}

function FieldInput({
  field,
  value,
  onChange,
  categories,
  exercises,
}: {
  field: PhysicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  categories: Category[];
  exercises: Exercise[];
}) {
  switch (field.kind) {
    case "text":
      return (
        <Textarea
          value={(value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          rows={2}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          step="1"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "decimal":
    case "distance_km":
      return (
        <Input
          type="number"
          step="0.01"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "duration_sec":
      return (
        <Input
          value={value == null ? "" : secondsToMmSs(value as number)}
          onChange={(e) => onChange(mmSsToSeconds(e.target.value))}
          placeholder="mm:ss"
        />
      );
    case "sets_array":
      return (
        <SetArrayInput
          value={(value as SetEntry[] | null) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "category_ref":
      return (
        <Select
          value={(value as string | null) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "exercise_ref":
      return (
        <Select
          value={(value as string | null) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger><SelectValue placeholder="Exercise" /></SelectTrigger>
          <SelectContent>
            {exercises.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
  }
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DynamicActivityForm({
  modalityId,
  fields,
  categories,
  exercises,
  initial,
}: {
  modalityId: string;
  fields: PhysicalField[];
  categories: Category[];
  exercises: Exercise[];
  initial?: ActivityInitial;
}) {
  const router = useRouter();
  const topFields = fields.filter((f) => f.scope === "top").sort((a, b) => a.sortOrder - b.sortOrder);
  const subrowFields = fields.filter((f) => f.scope === "subrow").sort((a, b) => a.sortOrder - b.sortOrder);

  const [performedAt, setPerformedAt] = useState<Date>(initial?.performedAt ?? new Date());
  const [values, setValues] = useState<ValueMap>(initial?.values ?? emptyValues(topFields));
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [subrows, setSubrows] = useState<SubrowState[]>(initial?.subrows ?? []);
  const [pending, startTransition] = useTransition();

  function setValue(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function setSubrowValue(idx: number, key: string, v: unknown) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], values: { ...next[idx].values, [key]: v } };
      return next;
    });
  }

  function setSubrowExercise(idx: number, exerciseId: string | null) {
    setSubrows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], exerciseId };
      return next;
    });
  }

  function addSubrow() {
    setSubrows((prev) => [
      ...prev,
      { exerciseId: null, values: emptyValues(subrowFields), sortOrder: prev.length },
    ]);
  }

  function removeSubrow(idx: number) {
    setSubrows((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
  }

  function moveSubrow(idx: number, direction: -1 | 1) {
    const next = idx + direction;
    if (next < 0 || next >= subrows.length) return;
    setSubrows((prev) => {
      const out = prev.slice();
      [out[idx], out[next]] = [out[next], out[idx]];
      return out.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  function submit() {
    const payload = {
      performedAt,
      values,
      comment: comment.trim() === "" ? null : comment,
      subrows,
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updateActivity(initial.id, modalityId, payload)
        : await createActivity(modalityId, payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Activity updated" : "Activity logged");
      router.push("/activities");
    });
  }

  function destroy() {
    if (!initial?.id) return;
    if (!confirm("Delete this activity? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteActivity(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Activity deleted");
      router.push("/activities");
    });
  }

  const distanceField = topFields.find((f) => f.kind === "distance_km");
  const durationField = topFields.find((f) => f.kind === "duration_sec" && f.key !== "pace");
  const pace =
    distanceField && durationField
      ? computePace(
          Number(values[distanceField.key] ?? 0),
          Number(values[durationField.key] ?? 0),
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Performed at</Label>
        <Input
          type="datetime-local"
          value={toLocalInputValue(performedAt)}
          onChange={(e) => setPerformedAt(new Date(e.target.value))}
        />
      </div>

      {topFields.map((f) => (
        <div key={f.id} className="space-y-2">
          <Label>
            {f.label}
            {f.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
          <FieldInput
            field={f}
            value={values[f.key]}
            onChange={(v) => setValue(f.key, v)}
            categories={categories}
            exercises={exercises}
          />
          {f.kind === "duration_sec" && f.key === "pace" && pace != null ? (
            <p className="text-xs text-muted-foreground">
              Computed from distance + duration: {secondsToMmSs(pace)} / km
            </p>
          ) : null}
        </div>
      ))}

      {subrowFields.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Subrows</Label>
            <Button size="sm" variant="outline" onClick={addSubrow}>
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>
          {subrows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No subrows.</p>
          ) : null}
          {subrows.map((row, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeSubrow(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exercise</Label>
                <Select
                  value={row.exerciseId ?? EXERCISE_NONE}
                  onValueChange={(v) => setSubrowExercise(idx, v === EXERCISE_NONE ? null : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXERCISE_NONE}>None</SelectItem>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subrowFields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>
                    {f.label}
                    {f.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </Label>
                  <FieldInput
                    field={f}
                    value={row.values[f.key]}
                    onChange={(v) => setSubrowValue(idx, f.key, v)}
                    categories={categories}
                    exercises={exercises}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Comment</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        {initial?.id ? (
          <Button variant="ghost" onClick={destroy} disabled={pending} className="text-destructive">
            Delete
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button onClick={submit} disabled={pending}>{initial?.id ? "Save" : "Log activity"}</Button>
      </div>
    </div>
  );
}
