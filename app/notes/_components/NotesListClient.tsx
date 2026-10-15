"use client";

import { useTransition } from "react";
import Link from "next/link";
import { noteListHref, type NoteListFilters } from "@/lib/notes/list";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNote } from "../_actions/notes";
import type { NoteKind } from "@/db/schema/notes";
import { NoteListRow, type NoteListItem } from "./NoteListRow";

export function NotesListClient({ notes, categories, filters, hasMore, createOpen }: { notes: NoteListItem[]; categories: { id: string; name: string }[]; filters: NoteListFilters; hasMore: boolean; createOpen: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const grouped = notes.reduce((groups, note) => {
    const key = note.categoryName ?? "Bez kategorije";
    const current = groups.get(key) ?? [];
    current.push(note);
    groups.set(key, current);
    return groups;
  }, new Map<string, NoteListItem[]>());

  function newNote(kind: NoteKind) {
    startTransition(async () => {
      const title = kind === "todo" ? `Kupovina · ${new Intl.DateTimeFormat("sr-Latn-RS").format(new Date())}` : "Nova beleška";
      const r = await createNote({ title, kind });
      if (r.ok) router.push(`/notes/${r.data.id}`);
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) router.replace(noteListHref(filters, filters.page)); }}>
        <DialogContent><DialogHeader><DialogTitle>Nova beleška</DialogTitle><DialogDescription>Izaberi belešku za pisanje ili listu za kupovinu.</DialogDescription></DialogHeader>
          <Button onClick={() => newNote("free")} disabled={pending}><StickyNote className="size-4" /> Slobodna beleška</Button>
          <Button onClick={() => newNote("todo")} disabled={pending} variant="outline"><ListChecks className="size-4" /> Lista za kupovinu</Button>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center gap-3">
        <form action="/notes" className="flex w-full max-w-md gap-2">
          {filters.category !== "all" ? <input type="hidden" name="category" value={filters.category} /> : null}
          <Input key={filters.query} name="q" defaultValue={filters.query} placeholder="Pretraži naslov i sadržaj" aria-label="Pretraži beleške" maxLength={500} />
          <Button type="submit" variant="outline">Pretraži</Button>
        </form>
        <Button onClick={() => newNote("free")} disabled={pending}><StickyNote className="size-4" /> Slobodna beleška</Button>
        <Button onClick={() => newNote("todo")} disabled={pending} variant="outline"><ListChecks className="size-4" /> Nova lista za kupovinu</Button>
      </div>
      {categories.length > 0 ? <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant={filters.category === "all" ? "default" : "outline"}><Link href={noteListHref({ ...filters, category: "all" })}>Sve kategorije</Link></Button>{categories.map((category) => <Button key={category.id} asChild size="sm" variant={filters.category === category.id ? "default" : "outline"}><Link href={noteListHref({ ...filters, category: category.id })}>{category.name}</Link></Button>)}</div> : null}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nema beležaka za izabrani prikaz.</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([group, groupNotes]) => <section key={group} className="space-y-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group} <span className="font-normal">({groupNotes.length})</span></h2>{groupNotes.map((note) => <NoteListRow key={note.id} note={note} />)}</section>)}
        </div>
      )}
      {filters.page > 1 || hasMore ? <nav aria-label="Stranice beležaka" className="flex items-center gap-3">
        {filters.page > 1 ? <Button asChild variant="outline"><Link href={noteListHref(filters, filters.page - 1)}>Prethodne beleške</Link></Button> : null}
        <span className="text-sm text-muted-foreground">Stranica {filters.page}</span>
        {hasMore ? <Button asChild variant="outline"><Link href={noteListHref(filters, filters.page + 1)}>Učitaj još</Link></Button> : null}
      </nav> : null}
    </div>
  );
}
