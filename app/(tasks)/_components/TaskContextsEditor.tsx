"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { attachContext, detachContext } from "../_actions/contexts";

export function TaskContextsEditor({
  taskId,
  allContexts,
  attachedContextIds,
}: {
  taskId: string;
  allContexts: { id: string; name: string; color: string | null }[];
  attachedContextIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const attached = new Set(attachedContextIds);

  function toggle(contextId: string) {
    const isAttached = attached.has(contextId);
    startTransition(async () => {
      const r = isAttached
        ? await detachContext(taskId, contextId)
        : await attachContext(taskId, contextId);
      if (!r.ok) toast.error(r.error);
    });
  }

  if (allContexts.length === 0) {
    return <p className="text-sm text-muted-foreground">No contexts created yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allContexts.map((c) => {
        const isOn = attached.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            disabled={pending}
            className="cursor-pointer"
          >
            <Badge
              variant={isOn ? "default" : "outline"}
              style={
                isOn && c.color
                  ? { backgroundColor: c.color, color: "white", borderColor: c.color }
                  : undefined
              }
            >
              {c.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
