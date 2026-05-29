"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./ColorPicker";
import { deletePriority, updatePriority } from "../_actions/priorities";

export function PriorityRow({
  id,
  name,
  color,
  rank,
  taskCount,
}: {
  id: string;
  name: string;
  color: string | null;
  rank: number;
  taskCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editColor, setEditColor] = useState<string | null>(color);
  const [editRank, setEditRank] = useState<string>(String(rank));
  const [pending, startTransition] = useTransition();

  function remove() {
    if (taskCount > 0 && !confirm(`Priority on ${taskCount} task(s). Remove?`)) return;
    startTransition(async () => {
      const r = await deletePriority(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function save() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const rankNum = Number(editRank);
    startTransition(async () => {
      const r = await updatePriority({
        id,
        name: trimmed,
        color: editColor,
        rank: Number.isFinite(rankNum) ? rankNum : undefined,
      });
      if (!r.ok) toast.error(r.error);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 max-w-xs"
            autoFocus
          />
          <Input
            type="number"
            min={0}
            value={editRank}
            onChange={(e) => setEditRank(e.target.value)}
            className="h-8 w-24"
            aria-label="Rank"
          />
          <Button size="icon" variant="ghost" onClick={save} disabled={pending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEditName(name);
              setEditColor(color);
              setEditRank(String(rank));
              setEditing(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ColorPicker value={editColor} onChange={setEditColor} />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 rounded-md border bg-card px-3 py-2">
      <Link href={`/tasks?priority=${id}`} className="flex flex-1 items-center gap-2">
        <Badge
          variant="outline"
          style={color ? { backgroundColor: color, color: "white", borderColor: color } : undefined}
        >
          {name}
        </Badge>
        <span className="text-xs text-muted-foreground">rank {rank}</span>
      </Link>
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
