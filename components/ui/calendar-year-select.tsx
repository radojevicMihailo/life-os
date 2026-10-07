"use client";

import { cn } from "@/lib/utils";

export function CalendarYearSelect({ year, onYearChange, minYear, maxYear, className }: {
  year: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}) {
  const first = Math.min(year, minYear ?? 1900);
  const last = Math.max(year, maxYear ?? 2100);
  return (
    <select
      aria-label="Izaberi godinu"
      value={year}
      onChange={(event) => onYearChange(Number(event.target.value))}
      className={cn("h-11 shrink-0 rounded-lg border border-input bg-background px-2 text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {Array.from({ length: last - first + 1 }, (_, index) => first + index).map((value) => (
        <option key={value} value={value} disabled={(minYear !== undefined && value < minYear) || (maxYear !== undefined && value > maxYear)}>{value}</option>
      ))}
    </select>
  );
}
