"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, StickyNote, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { browserDraftStorage, createDraftStore, type DraftRecovery } from "@/lib/notes/draft";
import { updateNoteSchema } from "@/lib/validation/notes";
import { Label } from "@/components/ui/label";
import { type NoteKind, noteKindLabel } from "@/db/schema/notes";
import { updateNote, deleteNote } from "../_actions/notes";
import { TodoItems, type TodoItem } from "./TodoItems";
import { RichNoteBody } from "./RichNoteBody";
import { createAutosave, type AutosaveState, type SaveGuard } from "@/lib/notes/autosave";
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
  const itemSaves = useRef<SaveGuard | null>(null);
  const latest = useRef<UpdateNoteInput>({ id, title: initialTitle, kind: initialKind, body: initialBody, categoryId: initialCategoryId });
  const [hasShoppingList, setHasShoppingList] = useState(initialKind === "todo");
  const [saveState, setSaveState] = useState<AutosaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [recovery, setRecovery] = useState<DraftRecovery<UpdateNoteInput> | null>(null);
  const [drafts] = useState(() => createDraftStore(browserDraftStorage, `life-os:note-draft:${id}`, {
    id, title: initialTitle, kind: initialKind, body: initialBody, categoryId: initialCategoryId,
  } as UpdateNoteInput, (value): value is UpdateNoteInput => {
    if (!value || typeof value !== "object" || !("title" in value) || typeof value.title !== "string" || value.title.length > 500) return false;
    return updateNoteSchema.safeParse({ ...value, title: "Nacrt" }).success && (value as UpdateNoteInput).id === id;
  }));
  useEffect(() => {
    // Read browser storage after hydration, without changing server-rendered markup.
    const timer = setTimeout(() => setRecovery(drafts.recover()), 0);
    return () => clearTimeout(timer);
  }, [drafts]);
  const [autosave] = useState(() => createAutosave(async (input: UpdateNoteInput) => {
    try {
      if (!input.title?.trim()) throw new Error("Unesi naslov beleške.");
      const result = await updateNote(input);
      if (!result.ok) throw new Error(result.error);
      drafts.saved(input);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Promene nisu sačuvane. Pokušaj ponovo.");
      throw error;
    }
  }, setSaveState));

  const flushAll = useCallback(async () => {
    const [metadata, products] = await Promise.all([autosave.flush(), itemSaves.current?.flush() ?? true]);
    return metadata && products;
  }, [autosave]);

  useEffect(() => () => { void autosave.flush(); void itemSaves.current?.flush(); }, [autosave]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!(autosave.isDirty() || itemSaves.current?.isDirty())) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function navigate(event: MouseEvent) {
      if (!(autosave.isDirty() || itemSaves.current?.isDirty()) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      startTransition(async () => {
        if (await flushAll()) router.push(destination.pathname + destination.search + destination.hash);
      });
    }
    function requestedNavigation(event: Event) {
      const href = (event as CustomEvent<{ href: string }>).detail?.href;
      if (!href || !(autosave.isDirty() || itemSaves.current?.isDirty())) return;
      event.preventDefault();
      startTransition(async () => { if (await flushAll()) router.push(href); });
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    window.addEventListener("life-os:before-navigate", requestedNavigation);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("life-os:before-navigate", requestedNavigation);
    };
  }, [autosave, flushAll, router]);

  function scheduleMetadata(patch: Partial<UpdateNoteInput>) {
    latest.current = { ...latest.current, ...patch };
    drafts.persist({ ...latest.current });
    autosave.schedule({ ...latest.current });
  }

  function save() {
    startTransition(async () => {
      if (!(await flushAll())) return;
      setPreview(true);
    });
  }

  function remove() {
    if (!confirm("Obrisati ovu belešku?")) return;
    startTransition(async () => {
      if (!(await flushAll())) return;
      const result = await deleteNote({ id });
      if (!result.ok) toast.error(result.error);
      else { drafts.discard(); router.push("/notes"); }
    });
  }

  function restoreDraft() {
    if (!recovery) return;
    const value = recovery.value;
    setTitle(value.title ?? initialTitle);
    setKind(value.kind ?? initialKind);
    setBody(value.body ?? initialBody);
    setCategoryId(value.categoryId ?? "none");
    if (value.kind === "todo") setHasShoppingList(true);
    setPreview(false);
    setRecovery(null);
    scheduleMetadata(value);
  }

  return <div className="max-w-4xl space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
    <Dialog open={Boolean(recovery)}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>Pronađene su nesačuvane izmene</DialogTitle><DialogDescription>{recovery?.conflict ? "Beleška na serveru se u međuvremenu promenila. Obnova će zameniti njen sadržaj nacrtom sa ovog uređaja." : "Na ovom uređaju postoji nacrt iz prethodne posete. Možeš da ga obnoviš i ponoviš čuvanje."}</DialogDescription></DialogHeader>
        <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-sm"><strong>{recovery?.value.title}</strong><p>{recovery?.value.body?.slice(0, 2000)}</p></div>
        <Button onClick={restoreDraft}>Obnovi nacrt i sačuvaj</Button>
        <Button variant="outline" onClick={() => { drafts.discard(); setRecovery(null); }}>Odbaci nacrt i zadrži sačuvanu belešku</Button>
      </DialogContent>
    </Dialog>
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-2"><Label htmlFor="note-title">Naslov</Label><Input id="note-title" value={title} onChange={(event) => { setTitle(event.target.value); scheduleMetadata({ title: event.target.value }); }} onBlur={() => { void autosave.flush(); }} maxLength={500} className="h-12 text-lg font-semibold" /></div>
      <div className="space-y-2"><Label htmlFor="note-category">Kategorija</Label><select id="note-category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); scheduleMetadata({ categoryId: event.target.value === "none" ? null : event.target.value }); }} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"><option value="none">Bez kategorije</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    </div>

    <div className="space-y-2"><Label>Vrsta beleške</Label><div role="group" aria-label="Vrsta beleške" className="flex flex-wrap gap-2">
      <Button type="button" variant={kind === "free" ? "default" : "outline"} aria-pressed={kind === "free"} onClick={() => { setKind("free"); scheduleMetadata({ kind: "free", body }); }}><StickyNote className="size-4" />{noteKindLabel.free}</Button>
      <Button type="button" variant={kind === "todo" ? "default" : "outline"} aria-pressed={kind === "todo"} onClick={() => { setHasShoppingList(true); setKind("todo"); scheduleMetadata({ kind: "todo", body }); }}><ListChecks className="size-4" />{noteKindLabel.todo}</Button>
    </div></div>

    {kind === "free" ? <div className="space-y-2"><Label>Sadržaj</Label><RichNoteBody body={body} onChange={(value) => { setBody(value); scheduleMetadata({ body: value }); }} preview={preview} onPreviewChange={setPreview} /></div> : null}
    {hasShoppingList ? <div hidden={kind !== "todo"}><TodoItems noteId={id} items={items} saveRef={itemSaves} /></div> : null}

    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      {kind === "free" ? <Button type="button" onClick={save} disabled={pending || !title.trim()}>Sačuvaj i prikaži</Button> : null}
      <div className="flex flex-wrap items-center gap-2"><span role="status" className="text-sm text-muted-foreground">{saveState === "saving" ? "Čuvanje…" : saveState === "error" ? saveError : "Sačuvano"}</span>{saveState === "error" ? <Button variant="outline" size="sm" onClick={() => { void autosave.flush(); }}>Pokušaj ponovo</Button> : null}</div>
      <Button type="button" variant="outline" asChild><Link href="/notes" onClick={(event) => { event.preventDefault(); startTransition(async () => { if (await flushAll()) router.push("/notes"); }); }}>Nazad na beleške</Link></Button>
      <Button type="button" variant="destructive" className="ml-auto" onClick={remove} disabled={pending} aria-label="Obriši belešku"><Trash2 className="size-4" /> Obriši</Button>
    </div>
  </div>;
}
