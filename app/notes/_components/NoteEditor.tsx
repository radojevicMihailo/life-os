"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type NoteKind, noteKindLabel } from "@/db/schema/notes";
import { updateNote, deleteNote } from "../_actions/notes";
import { MarkdownBody } from "./MarkdownBody";
import { TodoItems, type TodoItem } from "./TodoItems";

export function NoteEditor({
  id,
  initialTitle,
  initialKind,
  initialBody,
  items,
}: {
  id: string;
  initialTitle: string;
  initialKind: NoteKind;
  initialBody: string;
  items: TodoItem[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<NoteKind>(initialKind);
  const [, startTransition] = useTransition();

  function saveTitle(value: string) {
    const v = value.trim();
    if (!v || v === initialTitle) return;
    startTransition(async () => {
      const r = await updateNote({ id, title: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function changeKind(next: NoteKind) {
    setKind(next);
    startTransition(async () => {
      const r = await updateNote({ id, kind: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteNote({ id });
      if (r.ok) router.push("/notes");
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={initialTitle}
          onBlur={(e) => saveTitle(e.target.value)}
          className="text-lg font-medium"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {noteKindLabel[kind]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => changeKind("free")}>
              {noteKindLabel.free}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeKind("todo")}>
              {noteKindLabel.todo}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={remove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {kind === "free" ? (
        <MarkdownBody id={id} initialBody={initialBody} />
      ) : (
        <TodoItems noteId={id} items={items} />
      )}
    </div>
  );
}
