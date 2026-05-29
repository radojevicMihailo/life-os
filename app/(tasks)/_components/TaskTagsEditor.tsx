"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { attachTag, detachTag } from "../_actions/tags";

export function TaskTagsEditor({
  taskId,
  allTags,
  attachedTagIds,
}: {
  taskId: string;
  allTags: { id: string; name: string; color: string | null }[];
  attachedTagIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const attached = new Set(attachedTagIds);

  function toggle(tagId: string) {
    const isAttached = attached.has(tagId);
    startTransition(async () => {
      const r = isAttached
        ? await detachTag(taskId, tagId)
        : await attachTag(taskId, tagId);
      if (!r.ok) toast.error(r.error);
    });
  }

  if (allTags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags created yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((t) => {
        const isOn = attached.has(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            disabled={pending}
            className="cursor-pointer"
          >
            <Badge
              variant={isOn ? "default" : "outline"}
              style={isOn && t.color ? { backgroundColor: t.color, color: "white", borderColor: t.color } : undefined}
            >
              {t.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
