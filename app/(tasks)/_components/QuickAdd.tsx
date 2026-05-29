"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createTask } from "../_actions/tasks";
import { DateField } from "./DateField";
import { formatTaskDate } from "@/lib/format";

export function QuickAdd() {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [dueWithTime, setDueWithTime] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createTask({
        title: trimmed,
        dueAt: dueAt ?? undefined,
      });
      if (result.ok) {
        setTitle("");
        setDueAt(null);
        setDueWithTime(false);
      } else {
        toast.error(result.error);
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
        placeholder="Add a task and press Enter"
        disabled={pending}
        autoFocus
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            <CalendarClock className="h-4 w-4" />
            {dueAt ? <span className="text-xs">{formatTaskDate(dueAt, dueWithTime)}</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex items-center gap-2">
            <DateField
              value={dueAt}
              onChange={setDueAt}
              withTime={dueWithTime}
              onToggleTime={setDueWithTime}
            />
            {dueAt && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDueAt(null);
                  setDueWithTime(false);
                }}
                aria-label="Clear due date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </form>
  );
}
