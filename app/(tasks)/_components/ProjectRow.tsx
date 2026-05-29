"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject, updateProject } from "../_actions/projects";

export function ProjectRow({
  id,
  name,
  archived,
  taskCount,
}: {
  id: string;
  name: string;
  archived: boolean;
  taskCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function toggleArchive() {
    startTransition(async () => {
      const r = await updateProject({ id, archived: !archived });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    if (taskCount > 0 && !confirm(`Delete project with ${taskCount} task(s)?`)) return;
    startTransition(async () => {
      const r = await deleteProject(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="group flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <Link href={`/projects/${id}`} className="flex-1 text-sm hover:underline">
        {name}
        <span className="ml-2 text-muted-foreground">({taskCount})</span>
      </Link>
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" onClick={toggleArchive} disabled={pending}>
          {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
