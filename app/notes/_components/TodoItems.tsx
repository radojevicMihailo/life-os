"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addItem,
  toggleItem,
  updateItemText,
  reorderItems,
  deleteItem,
} from "../_actions/notes";

export type TodoItem = { id: string; text: string; done: boolean; position: number };

export function TodoItems({ noteId, items }: { noteId: string; items: TodoItem[] }) {
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    run(() => addItem({ noteId, text }));
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2 rounded-md border p-2">
            <Checkbox
              checked={it.done}
              onCheckedChange={(c) => run(() => toggleItem({ id: it.id, done: Boolean(c) }))}
            />
            <Input
              defaultValue={it.text}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== it.text) run(() => updateItemText({ id: it.id, text: v }));
              }}
              className={`h-8 border-0 shadow-none focus-visible:ring-0 ${
                it.done ? "text-muted-foreground line-through" : ""
              }`}
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={idx === 0}
              onClick={() => run(() => reorderItems({ id: it.id, direction: "up" }))}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={idx === items.length - 1}
              onClick={() => run(() => reorderItems({ id: it.id, direction: "down" }))}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => run(() => deleteItem({ id: it.id }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item and press Enter"
        />
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
    </div>
  );
}
