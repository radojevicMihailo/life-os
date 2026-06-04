"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createGoal } from "../_actions/goals";
import { DateField } from "@/app/(tasks)/_components/DateField";
import { formatTaskDate } from "@/lib/format";

export function GoalQuickAdd() {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createGoal({ title: trimmed, targetDate: targetDate ?? undefined });
      if (r.ok) {
        setTitle("");
        setTargetDate(null);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full max-w-xl items-center gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a goal and press Enter"
        disabled={pending}
        autoFocus
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            <CalendarClock className="h-4 w-4" />
            {targetDate ? <span className="text-xs">{formatTaskDate(targetDate)}</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex items-center gap-2">
            <DateField
              value={targetDate}
              onChange={setTargetDate}
              withTime={false}
              onToggleTime={() => {}}
            />
            {targetDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTargetDate(null)}
                aria-label="Clear target date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Button type="submit" size="sm" disabled={pending || !title.trim()} className="gap-1">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
