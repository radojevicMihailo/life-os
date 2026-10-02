"use client";

import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dateToInputValue, inputValueToDate } from "@/lib/date-input";

export function DateField({
  value,
  onChange,
  withTime,
  onToggleTime,
  id,
  disabled,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  withTime: boolean;
  onToggleTime: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        id={id}
        disabled={disabled}
        type={withTime ? "datetime-local" : "date"}
        value={dateToInputValue(value, withTime)}
        onChange={(e) => onChange(inputValueToDate(e.target.value, withTime))}
        className="flex-1"
      />
      <Button
        type="button"
        disabled={disabled}
        variant={withTime ? "default" : "outline"}
        size="icon"
        onClick={() => {
          if (value) {
            const next = new Date(value);
            if (withTime) next.setHours(0, 0, 0, 0);
            else if (next.getHours() === 0 && next.getMinutes() === 0) {
              const now = new Date();
              next.setHours(now.getHours(), now.getMinutes(), 0, 0);
            }
            onChange(next);
          }
          onToggleTime(!withTime);
        }}
        aria-label={withTime ? "Ukloni vreme" : "Dodaj vreme"}
        aria-pressed={withTime}
        title={withTime ? "Ukloni vreme" : "Dodaj vreme"}
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}
