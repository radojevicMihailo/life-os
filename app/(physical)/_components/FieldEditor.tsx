"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addField,
  removeField,
  reorderFields,
  updateField,
} from "../_actions/fields";
import {
  fieldKindLabel,
  type FieldKind,
  type FieldScope,
  type PhysicalField,
} from "@/db/schema/physical";

const KIND_ORDER: FieldKind[] = [
  "text",
  "number",
  "decimal",
  "duration_sec",
  "distance_km",
  "sets_array",
  "category_ref",
  "exercise_ref",
];

export function FieldEditor({
  modalityId,
  scope,
  fields,
}: {
  modalityId: string;
  scope: FieldScope;
  fields: PhysicalField[];
}) {
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<FieldKind>("text");
  const [required, setRequired] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitAdd() {
    startTransition(async () => {
      const result = await addField({
        modalityId,
        scope,
        key,
        label,
        kind,
        required,
        sortOrder: fields.length,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Field added");
      setKey("");
      setLabel("");
      setKind("text");
      setRequired(false);
      setAdding(false);
    });
  }

  function toggleRequired(field: PhysicalField, value: boolean) {
    startTransition(async () => {
      const result = await updateField({ id: field.id, required: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function relabel(field: PhysicalField, value: string) {
    startTransition(async () => {
      const result = await updateField({ id: field.id, label: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function move(idx: number, direction: -1 | 1) {
    const next = idx + direction;
    if (next < 0 || next >= fields.length) return;
    const reordered = fields.slice();
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    startTransition(async () => {
      const result = await reorderFields(
        modalityId,
        reordered.map((f) => f.id),
      );
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(field: PhysicalField) {
    if (!confirm(`Remove field "${field.label}"? Existing activity data is preserved.`)) return;
    startTransition(async () => {
      const result = await removeField(field.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {fields.map((f, idx) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <div className="flex flex-1 items-center gap-3">
              <Input
                defaultValue={f.label}
                onBlur={(e) => {
                  if (e.target.value !== f.label) relabel(f, e.target.value);
                }}
                className="max-w-[14rem]"
              />
              <span className="text-xs text-muted-foreground">{f.key}</span>
              <span className="text-xs">{fieldKindLabel[f.kind]}</span>
              <label className="ml-2 flex items-center gap-2 text-xs">
                <Checkbox
                  checked={f.required}
                  onCheckedChange={(v) => toggleRequired(f, Boolean(v))}
                />
                required
              </label>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={pending}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={pending}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(f)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-md border p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. distance" />
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Distance" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as FieldKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_ORDER.filter((k) => scope === "subrow" || k !== "sets_array").map((k) => (
                    <SelectItem key={k} value={k}>{fieldKindLabel[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2">
              <Checkbox checked={required} onCheckedChange={(v) => setRequired(Boolean(v))} />
              <span>Required</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={pending}>Cancel</Button>
            <Button onClick={submitAdd} disabled={pending || !key.trim() || !label.trim()}>Add field</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add {scope === "top" ? "top-level" : "subrow"} field
        </Button>
      )}
    </div>
  );
}
