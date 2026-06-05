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
import type { ActivityTag, ActivityTagGroup } from "@/db/schema/physical";
import { archiveSplit, createSplit, deleteSplit, updateSplit } from "../_actions/splits";

type DayRow = { tagIds: string[]; sortOrder: number };

export type SplitInitial = {
  id?: string;
  name: string;
  notes: string | null;
  days: DayRow[];
  archivedAt?: Date | null;
};

const NONE = "__none__";

export function SplitForm({
  tagGroups,
  tags,
  initial,
}: {
  tagGroups: ActivityTagGroup[];
  tags: ActivityTag[];
  initial?: SplitInitial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [days, setDays] = useState<DayRow[]>(initial?.days ?? []);
  const [pending, startTransition] = useTransition();

  const tagsByGroup = new Map<string, ActivityTag[]>();
  for (const t of tags) {
    const list = tagsByGroup.get(t.groupId) ?? [];
    list.push(t);
    tagsByGroup.set(t.groupId, list);
  }
  const tagById = new Map(tags.map((t) => [t.id, t]));

  function selectedForGroup(day: DayRow, groupId: string): string | null {
    for (const id of day.tagIds) {
      const t = tagById.get(id);
      if (t?.groupId === groupId) return id;
    }
    return null;
  }

  function setDayTagForGroup(idx: number, groupId: string, tagId: string | null) {
    setDays((prev) => {
      const next = prev.slice();
      const day = next[idx];
      const keep = day.tagIds.filter((id) => tagById.get(id)?.groupId !== groupId);
      next[idx] = { ...day, tagIds: tagId ? [...keep, tagId] : keep };
      return next;
    });
  }

  function add() {
    setDays((prev) => [...prev, { tagIds: [], sortOrder: prev.length }]);
  }

  function remove(idx: number) {
    setDays((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, sortOrder: i })));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= days.length) return;
    setDays((prev) => {
      const out = prev.slice();
      [out[idx], out[next]] = [out[next], out[idx]];
      return out.map((d, i) => ({ ...d, sortOrder: i }));
    });
  }

  function submit() {
    const payload = {
      name,
      notes: notes.trim() === "" ? null : notes,
      days: days.map((d, i) => ({ tagIds: d.tagIds, sortOrder: i })),
    };
    startTransition(async () => {
      const result = initial?.id
        ? await updateSplit(initial.id, payload)
        : await createSplit(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Split updated" : "Split created");
      router.push("/plans/splits");
    });
  }

  function archive() {
    if (!initial?.id) return;
    if (!confirm("Archive this split?")) return;
    startTransition(async () => {
      const result = await archiveSplit(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Archived");
      router.push("/plans/splits");
    });
  }

  function destroy() {
    if (!initial?.id) return;
    if (!confirm("Delete this split? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteSplit(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      router.push("/plans/splits");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Microcycle A" />
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
          <Label>Days</Label>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-2 h-4 w-4" /> Add day
          </Button>
        </div>
        {days.length === 0 ? <p className="text-xs text-muted-foreground">No days yet.</p> : null}
        {days.map((day, idx) => (
          <div key={idx} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Day {idx + 1}</span>
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
            {tagGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tag groups. Create some in Configuration.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tagGroups.map((g) => {
                  const groupTags = tagsByGroup.get(g.id) ?? [];
                  const current = selectedForGroup(day, g.id);
                  return (
                    <div key={g.id} className="space-y-2">
                      <Label>{g.name}</Label>
                      <Select
                        value={current ?? NONE}
                        onValueChange={(v) => setDayTagForGroup(idx, g.id, v === NONE ? null : v)}
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
            )}
          </div>
        ))}
        {days.length > 0 ? (
          <Button size="sm" variant="outline" onClick={add} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add day
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
          {initial?.id ? "Save" : "Create split"}
        </Button>
      </div>
    </div>
  );
}
