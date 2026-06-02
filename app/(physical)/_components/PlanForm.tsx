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
import {
  hhmmssToSeconds,
  mmSsToSeconds,
  secondsToHhmmss,
  secondsToMmSs,
} from "@/lib/physical/formatDuration";
import {
  type ActivityTag,
  type ActivityTagGroup,
  type Exercise,
  type ExerciseGroup,
  type PhysicalField,
  type SetEntry,
} from "@/db/schema/physical";
import { SetArrayInput } from "./SetArrayInput";
import { archivePlan, createPlan, deletePlan, updatePlan } from "../_actions/plans";

type ValueMap = Record<string, unknown>;
type SubrowState = { exerciseId: string | null; values: ValueMap; sortOrder: number };

export type PlanInitial = {
  id?: string;
  name: string;
  notes: string | null;
  tagIds: string[];
  subrows: SubrowState[];
  archivedAt?: Date | null;
};

const NONE = "__none__";
const EXERCISE_NONE = "__none__";

function emptyValues(fields: PhysicalField[]): ValueMap {
  const out: ValueMap = {};
  for (const f of fields) {
    if (f.kind === "sets_array") out[f.key] = [];
    else out[f.key] = null;
  }
  return out;
}

function DurationInput({
  value,
  onChange,
  format,
}: {
  value: number | null;
  onChange: (v: unknown) => void;
  format: "hhmmss" | "mmss";
}) {
  const fmt = format === "hhmmss" ? secondsToHhmmss : secondsToMmSs;
  const parse = format === "hhmmss" ? hhmmssToSeconds : mmSsToSeconds;
  const placeholder = format === "hhmmss" ? "hh:mm:ss" : "mm:ss";
  const [text, setText] = useState<string>(value == null ? "" : fmt(value));
  return (
    <Input
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next.trim() === "") {
          onChange(null);
          return;
        }
        const parsed = parse(next);
        if (parsed != null) onChange(parsed);
      }}
      onBlur={() => {
        if (text.trim() === "") return;
        const parsed = parse(text);
        if (parsed == null) setText(value == null ? "" : fmt(value));
        else setText(fmt(parsed));
      }}
      placeholder={placeholder}
    />
  );
}

function SubrowFieldInput({
  field,
  value,
  onChange,
  groups,
}: {
  field: PhysicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  groups: ExerciseGroup[];
}) {
  switch (field.kind) {
    case "text":
      return (
        <Input value={(value as string | null) ?? ""} onChange={(e) => onChange(e.target.value || null)} />
      );
    case "number":
      return (
        <Input
          type="number" step="1"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "decimal":
    case "distance_km":
      return (
        <Input
          type="number" step="0.01"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "duration_sec":
      return (
        <DurationInput
          value={value as number | null}
          onChange={onChange}
          format={field.key === "pace" ? "mmss" : "hhmmss"}
        />
      );
    case "sets_array":
      return <SetArrayInput value={(value as SetEntry[] | null) ?? []} onChange={onChange} />;
    case "category_ref":
      return (
        <Select value={(value as string | null) ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "exercise_ref":
      return null;
  }
}

export function PlanForm({
  tagGroups,
  tags,
  subrowFields,
  exerciseGroups,
  exercises,
  initial,
}: {
  tagGroups: ActivityTagGroup[];
  tags: ActivityTag[];
  subrowFields: PhysicalField[];
  exerciseGroups: ExerciseGroup[];
  exercises: Exercise[];
  initial?: PlanInitial;
}) {
  const router = useRouter();

  const tagsByGroup = new Map<string, ActivityTag[]>();
  for (const t of tags) {
    const list = tagsByGroup.get(t.groupId) ?? [];
    list.push(t);
    tagsByGroup.set(t.groupId, list);
  }
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const initialSelection: Record<string, string> = {};
  for (const id of initial?.tagIds ?? []) {
    const t = tagById.get(id);
    if (t) initialSelection[t.groupId] = id;
  }

  const [selectedTagByGroup, setSelectedTagByGroup] = useState<Record<string, string>>(initialSelection);
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [subrows, setSubrows] = useState<SubrowState[]>(initial?.subrows ?? []);
  const [pending, startTransition] = useTransition();

  function setTag(groupId: string, value: string) {
    setSelectedTagByGroup((prev) => {
      const next = { ...prev };
      if (value === NONE) delete next[groupId];
      else next[groupId] = value;
      return next;
    });
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
    const tagIds = Object.values(selectedTagByGroup);
    const payload = {
      name,
      notes: notes.trim() === "" ? null : notes,
      tagIds,
      subrows,
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updatePlan(initial.id, payload)
        : await createPlan(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Plan updated" : "Plan created");
      router.push("/plans");
    });
  }

  function archive() {
    if (!initial?.id) return;
    if (!confirm("Archive this plan?")) return;
    startTransition(async () => {
      const result = await archivePlan(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan archived");
      router.push("/plans");
    });
  }

  function destroy() {
    if (!initial?.id) return;
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deletePlan(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan deleted");
      router.push("/plans");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day A" />
      </div>

      {tagGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tagGroups.map((g) => {
            const groupTags = tagsByGroup.get(g.id) ?? [];
            return (
              <div key={g.id} className="space-y-2">
                <Label>{g.name}</Label>
                <Select
                  value={selectedTagByGroup[g.id] ?? NONE}
                  onValueChange={(v) => setTag(g.id, v)}
                >
                  <SelectTrigger><SelectValue placeholder={`Pick ${g.name}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {groupTags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Goal, intent, references…" />
      </div>

      {subrowFields.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Planned rows</Label>
            <Button size="sm" variant="outline" onClick={addSubrow}>
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>
          {subrows.length === 0 ? <p className="text-xs text-muted-foreground">No rows yet.</p> : null}
          {subrows.map((row, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveSubrow(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeSubrow(idx)}><Trash2 className="h-4 w-4" /></Button>
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
                  <Label>{f.label}</Label>
                  <SubrowFieldInput
                    field={f}
                    value={row.values[f.key]}
                    onChange={(v) => setSubrowValue(idx, f.key, v)}
                    groups={exerciseGroups}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

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
        <Button onClick={submit} disabled={pending || !name.trim()}>{initial?.id ? "Save" : "Create plan"}</Button>
      </div>
    </div>
  );
}
