"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteTag } from "../_actions/tags";

export function TagRow({
  id,
  name,
  color,
  taskCount,
}: {
  id: string;
  name: string;
  color: string | null;
  taskCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (taskCount > 0 && !confirm(`Tag is on ${taskCount} task(s). Remove?`)) return;
    startTransition(async () => {
      const r = await deleteTag(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="group flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <Link href={`/tasks?tag=${id}`} className="flex flex-1 items-center gap-2 hover:underline">
        <Badge
          variant="secondary"
          style={color ? { backgroundColor: color, color: "white" } : undefined}
        >
          {name}
        </Badge>
        <span className="text-xs text-muted-foreground">{taskCount} task(s)</span>
      </Link>
      <Button
        size="icon"
        variant="ghost"
        onClick={remove}
        disabled={pending}
        className="opacity-0 transition group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
