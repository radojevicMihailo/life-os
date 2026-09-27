"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNote } from "../_actions/notes";
import type { NoteKind } from "@/db/schema/notes";
import { NoteListRow, type NoteListItem } from "./NoteListRow";

export function NotesListClient({ notes, categories }: { notes: NoteListItem[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (categoryFilter === "all" || n.categoryId === categoryFilter) &&
        (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)),
    );
  }, [notes, query, categoryFilter]);

  const grouped = filtered.reduce((groups, note) => {
    const key = note.categoryName ?? "Bez kategorije";
    const current = groups.get(key) ?? [];
    current.push(note);
    groups.set(key, current);
    return groups;
  }, new Map<string, NoteListItem[]>());

  function newNote(kind: NoteKind) {
    startTransition(async () => {
      const r = await createNote({ title: "Nova beleška", kind });
      if (r.ok) router.push(`/notes/${r.data.id}`);
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraži beleške"
          className="max-w-sm"
        />
        <Button onClick={() => newNote("free")} disabled={pending}><StickyNote className="size-4" /> Slobodna beleška</Button>
        <Button onClick={() => newNote("todo")} disabled={pending} variant="outline"><ListChecks className="size-4" /> Lista zadataka</Button>
      </div>
      {categories.length > 0 ? <div className="flex flex-wrap gap-2"><Button size="sm" variant={categoryFilter === "all" ? "default" : "outline"} onClick={() => setCategoryFilter("all")}>Sve kategorije</Button>{categories.map((category) => <Button key={category.id} size="sm" variant={categoryFilter === category.id ? "default" : "outline"} onClick={() => setCategoryFilter(category.id)}>{category.name}</Button>)}</div> : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nema beležaka za izabrani prikaz.</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([group, groupNotes]) => <section key={group} className="space-y-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group} <span className="font-normal">({groupNotes.length})</span></h2>{groupNotes.map((note) => <NoteListRow key={note.id} note={note} />)}</section>)}
        </div>
      )}
    </div>
  );
}
