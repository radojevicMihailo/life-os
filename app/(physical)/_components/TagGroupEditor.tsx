"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addTagGroup, removeTagGroup, renameTagGroup } from "../_actions/tagGroups";
import { addTag, removeTag, updateTag } from "../_actions/tags";
import type { ActivityTag, ActivityTagGroup } from "@/db/schema/physical";

type Section = { group: ActivityTagGroup; tags: ActivityTag[] };

export function TagGroupEditor({ sections }: { sections: Section[] }) {
  const [groupName, setGroupName] = useState("");
  const [pending, startTransition] = useTransition();

  function submitGroup() {
    startTransition(async () => {
      const result = await addTagGroup({ name: groupName, sortOrder: sections.length });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setGroupName("");
    });
  }

  function renameGroup(g: ActivityTagGroup, value: string) {
    if (value === g.name) return;
    startTransition(async () => {
      const result = await renameTagGroup({ id: g.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function removeGroup(g: ActivityTagGroup) {
    if (!confirm(`Remove tag group "${g.name}"? All tags inside are deleted too.`)) return;
    startTransition(async () => {
      const result = await removeTagGroup(g.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <TagGroupCard
            key={s.group.id}
            group={s.group}
            tags={s.tags}
            onRenameGroup={renameGroup}
            onRemoveGroup={removeGroup}
            pending={pending}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="New tag group (e.g. Intent)"
          className="max-w-xs"
        />
        <Button size="sm" onClick={submitGroup} disabled={pending || !groupName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add group
        </Button>
      </div>
    </div>
  );
}

function TagGroupCard({
  group,
  tags,
  onRenameGroup,
  onRemoveGroup,
  pending,
}: {
  group: ActivityTagGroup;
  tags: ActivityTag[];
  onRenameGroup: (g: ActivityTagGroup, value: string) => void;
  onRemoveGroup: (g: ActivityTagGroup) => void;
  pending: boolean;
}) {
  const [tagName, setTagName] = useState("");
  const [localPending, startTransition] = useTransition();

  function submitTag() {
    startTransition(async () => {
      const result = await addTag({ groupId: group.id, name: tagName, sortOrder: tags.length });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTagName("");
    });
  }

  function renameTag(t: ActivityTag, value: string) {
    if (value === t.name) return;
    startTransition(async () => {
      const result = await updateTag({ id: t.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function deleteTag(t: ActivityTag) {
    if (!confirm(`Remove tag "${t.name}"?`)) return;
    startTransition(async () => {
      const result = await removeTag(t.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  const busy = pending || localPending;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={group.name}
          onBlur={(e) => onRenameGroup(group, e.target.value)}
          className="font-medium"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemoveGroup(group)}
          disabled={busy}
          title="Remove group"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-2">
        {tags.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input
              defaultValue={t.name}
              onBlur={(e) => renameTag(t, e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button size="icon" variant="ghost" onClick={() => deleteTag(t)} disabled={busy}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          placeholder="New tag"
          className="flex-1 min-w-0"
        />
        <Button size="sm" onClick={submitTag} disabled={busy || !tagName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  );
}
