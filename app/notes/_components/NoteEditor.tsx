"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, StickyNote, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type NoteKind, noteKindLabel } from "@/db/schema/notes";
import { updateNote, deleteNote } from "../_actions/notes";
import { TodoItems, type TodoItem } from "./TodoItems";
import { RichNoteBody } from "./RichNoteBody";

export function NoteEditor({
  id, initialTitle, initialKind, initialBody, initialCategoryId, categories, items,
}: {
  id: string;
  initialTitle: string;
  initialKind: NoteKind;
  initialBody: string;
  initialCategoryId: string | null;
  categories: { id: string; name: string }[];
  items: TodoItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [kind, setKind] = useState<NoteKind>(initialKind);
  const [body, setBody] = useState(initialBody);
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "none");
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Unesi naslov beleške."); return; }
    startTransition(async () => {
      const result = await updateNote({ id, title: trimmed, kind, body, categoryId: categoryId === "none" ? null : categoryId });
      if (!result.ok) { toast.error(result.error); return; }
      router.push("/notes");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Obrisati ovu belešku?")) return;
    startTransition(async () => {
      const result = await deleteNote({ id });
      if (!result.ok) toast.error(result.error);
      else router.push("/notes");
    });
  }

  return <div className="max-w-4xl space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-2"><Label htmlFor="note-title">Naslov</Label><Input id="note-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={500} className="h-12 text-lg font-semibold" /></div>
      <div className="space-y-2"><Label htmlFor="note-category">Kategorija</Label><select id="note-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"><option value="none">Bez kategorije</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    </div>

    <div className="space-y-2"><Label>Vrsta beleške</Label><div role="group" aria-label="Vrsta beleške" className="flex flex-wrap gap-2">
      <Button type="button" variant={kind === "free" ? "default" : "outline"} aria-pressed={kind === "free"} onClick={() => setKind("free")}><StickyNote className="size-4" />{noteKindLabel.free}</Button>
      <Button type="button" variant={kind === "todo" ? "default" : "outline"} aria-pressed={kind === "todo"} onClick={() => setKind("todo")}><ListChecks className="size-4" />{noteKindLabel.todo}</Button>
    </div></div>

    {kind === "free" ? <div className="space-y-2"><Label>Sadržaj</Label><RichNoteBody initialBody={initialBody} onChange={setBody} /></div> : <TodoItems noteId={id} items={items} />}

    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      <Button type="button" onClick={save} disabled={pending || !title.trim()}>Sačuvaj i vrati se</Button>
      <Button type="button" variant="outline" asChild><Link href="/notes">Otkaži</Link></Button>
      <Button type="button" variant="destructive" className="ml-auto" onClick={remove} disabled={pending} aria-label="Obriši belešku"><Trash2 className="size-4" /> Obriši</Button>
    </div>
  </div>;
}
