"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Archive, ArchiveRestore, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject, updateProject } from "../_actions/projects";

export function ProjectRow({
  id,
  name,
  archived,
  doneCount,
  totalCount,
}: {
  id: string;
  name: string;
  archived: boolean;
  doneCount: number;
  totalCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [pending, startTransition] = useTransition();

  function toggleArchive() {
    startTransition(async () => {
      const r = await updateProject({ id, archived: !archived });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    if (totalCount > 0 && !confirm(`Delete project with ${totalCount} task(s)?`)) return;
    startTransition(async () => {
      const r = await deleteProject(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function save() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateProject({ id, name: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setEditName(name);
      }
      setEditing(false);
    });
  }

  return (
    <div className="group flex items-center justify-between rounded-md border bg-card px-3 py-2">
      {editing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setEditName(name);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-8 max-w-xs"
        />
      ) : (
        <Link href={`/projects/${id}`} className="flex-1 text-sm">
          {name}
          <span className="ml-2 text-muted-foreground">{doneCount}/{totalCount}</span>
        </Link>
      )}
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" onClick={save} disabled={pending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditName(name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleArchive} disabled={pending}>
              {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
