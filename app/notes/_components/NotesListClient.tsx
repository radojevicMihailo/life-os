"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNote } from "../_actions/notes";
import { NoteListRow, type NoteListItem } from "./NoteListRow";

export function NotesListClient({ notes }: { notes: NoteListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }, [notes, query]);

  function newNote() {
    startTransition(async () => {
      const r = await createNote({ title: "Untitled", kind: "free" });
      if (r.ok) router.push(`/notes/${r.data.id}`);
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes"
          className="max-w-sm"
        />
        <Button onClick={newNote} disabled={pending} size="sm">
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NoteListRow key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
