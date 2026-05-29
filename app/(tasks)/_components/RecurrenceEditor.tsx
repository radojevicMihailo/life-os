"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecurrenceRule } from "@/db/schema/tasks";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
}) {
  const enabled = value != null;
  const freq = value?.freq ?? "daily";
  const interval = value?.interval ?? 1;
  const byweekday = value?.byweekday ?? [];

  function setFreq(f: "daily" | "weekly" | "monthly") {
    onChange({ freq: f, interval, byweekday: f === "weekly" ? byweekday : undefined });
  }

  function setInterval(n: number) {
    if (!value) return;
    onChange({ ...value, interval: Math.max(1, n) });
  }

  function toggleDay(d: number) {
    if (!value) return;
    const current = new Set(value.byweekday ?? []);
    if (current.has(d)) current.delete(d);
    else current.add(d);
    const arr = [...current].sort((a, b) => a - b);
    onChange({ ...value, byweekday: arr.length > 0 ? arr : undefined });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Recurrence</Label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              e.target.checked
                ? onChange({ freq: "daily", interval: 1 })
                : onChange(null)
            }
          />
          Enabled
        </label>
      </div>
      {enabled && (
        <>
          <div className="flex gap-2">
            <Select value={freq} onValueChange={(v) => setFreq(v as "daily" | "weekly" | "monthly")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-20"
            />
            <span className="self-center text-sm text-muted-foreground">
              {freq === "daily" ? "day(s)" : freq === "weekly" ? "week(s)" : "month(s)"}
            </span>
          </div>
          {freq === "weekly" && (
            <div className="flex flex-wrap gap-1">
              {weekdays.map((label, idx) => {
                const on = byweekday.includes(idx);
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`h-7 w-10 rounded border text-xs ${
                      on
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
