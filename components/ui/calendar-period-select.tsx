"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const months = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];
const triggerClass = "data-[size=default]:h-11 rounded-xl border-primary/20 bg-primary/5 px-2.5 font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15";
const contentClass = "max-h-72 rounded-xl border border-border bg-popover p-1 shadow-xl";
const itemClass = "min-h-10 rounded-lg px-3 data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary";

export function CalendarPeriodSelect({ year, month, onYearChange, onMonthChange, minYear, maxYear }: {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const first = Math.min(year, minYear ?? 1900);
  const last = Math.max(year, maxYear ?? 2100);
  return (
    <div role="group" aria-label="Mesec i godina" className="inline-flex shrink-0 items-center gap-1.5">
      <Select value={String(month)} onValueChange={(value) => onMonthChange(Number(value))}>
        <SelectTrigger aria-label="Izaberi mesec" className={`${triggerClass} min-w-[7rem]`}><SelectValue>{months[month]}</SelectValue></SelectTrigger>
        <SelectContent className={contentClass}>
          <SelectGroup>{months.map((label, value) => <SelectItem key={value} value={String(value)} className={itemClass}>{label}</SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(value) => onYearChange(Number(value))}>
        <SelectTrigger aria-label="Izaberi godinu" className={`${triggerClass} min-w-[4.75rem] tabular-nums`}><SelectValue>{year}</SelectValue></SelectTrigger>
        <SelectContent className={`${contentClass} min-w-24`}>
          <SelectGroup>{Array.from({ length: last - first + 1 }, (_, index) => first + index).map((value) => (
            <SelectItem key={value} value={String(value)} className={`${itemClass} tabular-nums`} disabled={(minYear !== undefined && value < minYear) || (maxYear !== undefined && value > maxYear)}>{value}</SelectItem>
          ))}</SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
