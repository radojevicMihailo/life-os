"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Habit, HabitCadence, HabitKind } from "@/db/schema/habits";
import { habitCadenceLabel, habitKindLabel } from "@/db/schema/habits";
import { createHabit, updateHabit } from "../_actions/habits";
import {
  ALL_WEEKDAYS_MASK,
  WEEKDAY_LABELS,
  toggleWeekday,
} from "@/lib/habits/schedule";
import { isoDate } from "@/lib/habits/date";

type Mode = { mode: "create" } | { mode: "edit"; habit: Habit };

export function HabitForm(props: Mode) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial = props.mode === "edit" ? props.habit : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? "binary");
  const [targetCount, setTargetCount] = useState<number>(initial?.targetCount ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [cadence, setCadence] = useState<HabitCadence>(initial?.cadence ?? "daily");
  const [weeklyTarget, setWeeklyTarget] = useState<number>(
    initial?.weeklyTarget ?? 3,
  );
  const [weekdays, setWeekdays] = useState<number>(
    initial?.weekdays ?? ALL_WEEKDAYS_MASK,
  );
  const [startDate, setStartDate] = useState<string>(
    initial?.startDate ?? isoDate(new Date()),
  );
  const [endDate, setEndDate] = useState<string>(initial?.endDate ?? "");

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title required");
      return;
    }
    const payload = {
      title: trimmed,
      description: description.trim() || null,
      kind,
      targetCount: kind === "count" ? Math.max(1, targetCount) : 1,
      unit: kind === "count" ? unit.trim() || null : null,
      cadence,
      weeklyTarget: cadence === "weekly_target" ? Math.max(1, weeklyTarget) : 0,
      weekdays: cadence === "weekdays" ? weekdays || ALL_WEEKDAYS_MASK : ALL_WEEKDAYS_MASK,
      startDate,
      endDate: endDate || null,
    };

    startTransition(async () => {
      const r =
        props.mode === "create"
          ? await createHabit(payload)
          : await updateHabit({ id: props.habit.id, ...payload });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(props.mode === "create" ? "Habit created" : "Saved");
      router.push("/habits");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="h-title">Title</Label>
        <Input
          id="h-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 20 minutes"
          autoFocus
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="h-desc">Description</Label>
        <Textarea
          id="h-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as HabitKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(habitKindLabel) as HabitKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {habitKindLabel[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {kind === "count" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="h-target">Daily target</Label>
              <Input
                id="h-target"
                type="number"
                min={1}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value) || 1)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-unit">Unit</Label>
              <Input
                id="h-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="reps, glasses..."
                disabled={pending}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Cadence</Label>
        <Select value={cadence} onValueChange={(v) => setCadence(v as HabitCadence)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(habitCadenceLabel) as HabitCadence[]).map((c) => (
              <SelectItem key={c} value={c}>
                {habitCadenceLabel[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cadence === "weekly_target" && (
        <div className="space-y-1.5">
          <Label htmlFor="h-weekly">Days per week</Label>
          <Input
            id="h-weekly"
            type="number"
            min={1}
            max={7}
            value={weeklyTarget}
            onChange={(e) =>
              setWeeklyTarget(Math.max(1, Math.min(7, Number(e.target.value) || 1)))
            }
            disabled={pending}
          />
        </div>
      )}

      {cadence === "weekdays" && (
        <div className="space-y-1.5">
          <Label>Weekdays</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, i) => {
              const checked = (weekdays & (1 << i)) !== 0;
              return (
                <label
                  key={label}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                    checked ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => setWeekdays((m) => toggleWeekday(m, i))}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="h-start">Start date</Label>
          <Input
            id="h-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="h-end">End date (optional)</Label>
          <Input
            id="h-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !title.trim()}>
          {props.mode === "create" ? "Create habit" : "Save"}
        </Button>
      </div>
    </form>
  );
}
