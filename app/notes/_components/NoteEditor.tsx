"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { createAutosave, type AutosaveState } from "@/lib/notes/autosave";
import type { UpdateNoteInput } from "@/lib/validation/notes";

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
  const [preview, setPreview] = useState(Boolean(initialBody.trim()));
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "none");
  const [pending, startTransition] = useTransition();
  const autoSaveEnabled = useRef(initialKind === "todo");
  const [hasShoppingList, setHasShoppingList] = useState(initialKind === "todo");
  const [saveState, setSaveState] = useState<AutosaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [autosave] = useState(() => createAutosave(async (input: UpdateNoteInput) => {
    try {
      if (!input.title?.trim()) throw new Error("Unesi naslov liste.");
      const result = await updateNote(input);
      if (!result.ok) throw new Error(result.error);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Promene nisu sačuvane. Pokušaj ponovo.");
      throw error;
    }
  }, setSaveState));

  useEffect(() => () => { void autosave.flush(); }, [autosave]);
  useEffect(() => {
    if (saveState === "saved") return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  function scheduleMetadata(patch: Partial<UpdateNoteInput>) {
    if (!autoSaveEnabled.current) return;
    autosave.schedule({ id, title, kind, body, categoryId: categoryId === "none" ? null : categoryId, ...patch });
  }

  function save() {
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Unesi naslov beleške."); return; }
    startTransition(async () => {
      if (!(await autosave.flush())) return;
      const result = await updateNote({ id, title: trimmed, kind, body, categoryId: categoryId === "none" ? null : categoryId });
      if (!result.ok) { toast.error(result.error); return; }
      setPreview(true);
      toast.success("Beleška je sačuvana.");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Obrisati ovu belešku?")) return;
    startTransition(async () => {
      if (!(await autosave.flush())) return;
      const result = await deleteNote({ id });
      if (!result.ok) toast.error(result.error);
      else router.push("/notes");
    });
  }

  return <div className="max-w-4xl space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-2"><Label htmlFor="note-title">Naslov</Label><Input id="note-title" value={title} onChange={(event) => { setTitle(event.target.value); scheduleMetadata({ title: event.target.value }); }} onBlur={() => { void autosave.flush(); }} maxLength={500} className="h-12 text-lg font-semibold" /></div>
      <div className="space-y-2"><Label htmlFor="note-category">Kategorija</Label><select id="note-category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); scheduleMetadata({ categoryId: event.target.value === "none" ? null : event.target.value }); }} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"><option value="none">Bez kategorije</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    </div>

    <div className="space-y-2"><Label>Vrsta beleške</Label><div role="group" aria-label="Vrsta beleške" className="flex flex-wrap gap-2">
      <Button type="button" variant={kind === "free" ? "default" : "outline"} aria-pressed={kind === "free"} onClick={() => { setKind("free"); scheduleMetadata({ kind: "free", body }); }}><StickyNote className="size-4" />{noteKindLabel.free}</Button>
      <Button type="button" variant={kind === "todo" ? "default" : "outline"} aria-pressed={kind === "todo"} onClick={() => { autoSaveEnabled.current = true; setHasShoppingList(true); setKind("todo"); scheduleMetadata({ kind: "todo", body }); }}><ListChecks className="size-4" />{noteKindLabel.todo}</Button>
    </div></div>

    {kind === "free" ? <div className="space-y-2"><Label>Sadržaj</Label><RichNoteBody body={body} onChange={setBody} preview={preview} onPreviewChange={setPreview} /></div> : null}
    {hasShoppingList ? <div hidden={kind !== "todo"}><TodoItems noteId={id} items={items} /></div> : null}

    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      {kind === "free" ? <Button type="button" onClick={save} disabled={pending || !title.trim()}>Sačuvaj i prikaži</Button> : null}
      {kind === "todo" || saveState !== "saved" ? <div className="flex flex-wrap items-center gap-2"><span role="status" className="text-sm text-muted-foreground">{saveState === "saving" ? "Čuvanje…" : saveState === "error" ? saveError : "Sačuvano"}</span>{saveState === "error" ? <Button variant="outline" size="sm" onClick={() => { void autosave.flush(); }}>Pokušaj ponovo</Button> : null}</div> : null}
      <Button type="button" variant="outline" asChild><Link href="/notes" onClick={(event) => { event.preventDefault(); startTransition(async () => { if (await autosave.flush()) router.push("/notes"); }); }}>Nazad na beleške</Link></Button>
      <Button type="button" variant="destructive" className="ml-auto" onClick={remove} disabled={pending} aria-label="Obriši belešku"><Trash2 className="size-4" /> Obriši</Button>
    </div>
  </div>;
}
