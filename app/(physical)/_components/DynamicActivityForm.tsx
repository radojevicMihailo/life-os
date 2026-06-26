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
  type SubrowKind,
} from "@/db/schema/physical";
import { SetArrayInput } from "./SetArrayInput";
import { createActivity, deleteActivity, updateActivity } from "../_actions/activities";

type ValueMap = Record<string, unknown>;
type SubrowState = {
  kind: SubrowKind;
  exerciseId: string | null;
  values: ValueMap;
  sortOrder: number;
};

export type ActivityInitial = {
  id?: string;
  performedAt: Date;
  values: ValueMap;
  comment: string | null;
  stravaUrl: string | null;
  tagIds: string[];
  subrows: SubrowState[];
};

const NONE = "__none__";
const EXERCISE_NONE = "__none__";
const SPLIT_KEYS = ["distance", "duration", "pace"] as const;
const EXERCISE_KEYS = ["sets"] as const;
const SPRINT_KEYS = ["sprintDistance", "sprintReps"] as const;

function fieldsForKind(fields: PhysicalField[], kind: SubrowKind): PhysicalField[] {
  const keys =
    kind === "split" ? SPLIT_KEYS : kind === "sprint" ? SPRINT_KEYS : EXERCISE_KEYS;
  return fields.filter((f) => (keys as readonly string[]).includes(f.key));
}

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
  groups,
  exercises,
}: {
  field: PhysicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  groups: ExerciseGroup[];
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
        <DurationInput
          value={value as number | null}
          onChange={onChange}
          format={field.key === "pace" ? "mmss" : "hhmmss"}
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
          <SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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

function toLocalDateInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromLocalDateInputValue(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function DynamicActivityForm({
  tagGroups,
  tags,
  topFields,
  subrowFields,
  exerciseGroups,
  exercises,
  initial,
}: {
  tagGroups: ActivityTagGroup[];
  tags: ActivityTag[];
  topFields: PhysicalField[];
  subrowFields: PhysicalField[];
  exerciseGroups: ExerciseGroup[];
  exercises: Exercise[];
  initial?: ActivityInitial;
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
    const tag = tagById.get(id);
    if (tag) initialSelection[tag.groupId] = id;
  }

  const [selectedTagByGroup, setSelectedTagByGroup] = useState<Record<string, string>>(initialSelection);
  const [performedAt, setPerformedAt] = useState<Date>(initial?.performedAt ?? new Date());
  const [values, setValues] = useState<ValueMap>({ ...emptyValues(topFields), ...(initial?.values ?? {}) });
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [stravaUrl, setStravaUrl] = useState<string>(initial?.stravaUrl ?? "");
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

  function setSubrowKind(idx: number, kind: SubrowKind) {
    setSubrows((prev) => {
      const next = prev.slice();
      const current = next[idx];
      if (current.kind === kind) return prev;
      next[idx] = {
        ...current,
        kind,
        exerciseId: kind === "exercise" ? current.exerciseId : null,
        values: emptyValues(fieldsForKind(subrowFields, kind)),
      };
      return next;
    });
  }

  function addSubrow(kind: SubrowKind) {
    setSubrows((prev) => [
      ...prev,
      {
        kind,
        exerciseId: null,
        values: emptyValues(fieldsForKind(subrowFields, kind)),
        sortOrder: prev.length,
      },
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
      performedAt,
      values,
      comment: comment.trim() === "" ? null : comment,
      stravaUrl: stravaUrl.trim() === "" ? null : stravaUrl.trim(),
      tagIds,
      subrows,
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updateActivity(initial.id, payload)
        : await createActivity(payload);
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

  return (
    <div className="space-y-6">
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
        <Label>Date</Label>
        <Input
          type="date"
          value={toLocalDateInputValue(performedAt)}
          onChange={(e) => setPerformedAt(fromLocalDateInputValue(e.target.value))}
        />
      </div>

      {topFields.map((f) => (
        <div key={f.id} className="space-y-2">
          <Label>{f.label}</Label>
          <FieldInput
            field={f}
            value={values[f.key]}
            onChange={(v) => setValue(f.key, v)}
            groups={exerciseGroups}
            exercises={exercises}
          />
        </div>
      ))}

      {subrowFields.length > 0 ? (
        <div className="space-y-2">
          <Label>Subrows</Label>
          {subrows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No subrows.</p>
          ) : null}
          {subrows.map((row, idx) => {
            const rowFields = fieldsForKind(subrowFields, row.kind);
            return (
              <div key={idx} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Row {idx + 1}</span>
                    <Select
                      value={row.kind}
                      onValueChange={(v) => setSubrowKind(idx, v as SubrowKind)}
                    >
                      <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="split">Split</SelectItem>
                        <SelectItem value="sprint">Sprint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                {row.kind === "exercise" ? (
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
                ) : null}
                {rowFields.map((f) => (
                  <div key={f.id} className="space-y-2">
                    <Label>{f.label}</Label>
                    <FieldInput
                      field={f}
                      value={row.values[f.key]}
                      onChange={(v) => setSubrowValue(idx, f.key, v)}
                      groups={exerciseGroups}
                      exercises={exercises}
                    />
                  </div>
                ))}
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => addSubrow("exercise")}>
              <Plus className="mr-2 h-4 w-4" /> Exercise
            </Button>
            <Button size="sm" variant="outline" onClick={() => addSubrow("split")}>
              <Plus className="mr-2 h-4 w-4" /> Split
            </Button>
            <Button size="sm" variant="outline" onClick={() => addSubrow("sprint")}>
              <Plus className="mr-2 h-4 w-4" /> Sprint
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Strava workout URL</Label>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://www.strava.com/activities/..."
          value={stravaUrl}
          onChange={(e) => setStravaUrl(e.target.value)}
        />
      </div>

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
