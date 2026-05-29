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
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  withTime: boolean;
  onToggleTime: (v: boolean) => void;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        id={id}
        type={withTime ? "datetime-local" : "date"}
        value={dateToInputValue(value, withTime)}
        onChange={(e) => onChange(inputValueToDate(e.target.value, withTime))}
        className="flex-1"
      />
      <Button
        type="button"
        variant={withTime ? "default" : "outline"}
        size="icon"
        onClick={() => onToggleTime(!withTime)}
        title={withTime ? "Date only" : "Add time"}
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}
