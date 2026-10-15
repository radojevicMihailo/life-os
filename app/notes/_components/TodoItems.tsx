"use client";

import { useEffect, useImperativeHandle, useOptimistic, useRef, useState, useTransition, type Ref } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createPendingAddDraft } from "@/lib/notes/pending-adds";
import { browserDraftStorage, createDraftStore, type DraftRecovery } from "@/lib/notes/draft";
import { createAutosave, type AutosaveState, type SaveGuard } from "@/lib/notes/autosave";
import { addItem, toggleItem, updateItemText, deleteItem, clearDoneItems } from "../_actions/notes";

export type TodoItem = { id: string; text: string; done: boolean; position: number };
type Change = { type: "add"; item: TodoItem } | { type: "toggle"; id: string; done: boolean } | { type: "delete"; id: string } | { type: "clear" };

export function TodoItems({ noteId, items, saveRef }: { noteId: string; items: TodoItem[]; saveRef?: Ref<SaveGuard> }) {
  const [pendingAdds] = useState(() => createPendingAddDraft(browserDraftStorage, `life-os:note-pending-adds:${noteId}`));
  const draftStores = useRef(new Map<string, ReturnType<typeof createDraftStore<string>>>());
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [recoveries, setRecoveries] = useState<Record<string, DraftRecovery<string>>>({});
  function productDraft(id: string, original: string) {
    let store = draftStores.current.get(id);
    if (!store) {
      store = createDraftStore(browserDraftStorage, `life-os:note-product-draft:${noteId}:${id}`, original, (value): value is string => typeof value === "string" && value.length <= 1000);
      draftStores.current.set(id, store);
    }
    return store;
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      const found: Record<string, DraftRecovery<string>> = {};
      for (const item of items) {
        const store = createDraftStore(browserDraftStorage, `life-os:note-product-draft:${noteId}:${item.id}`, item.text, (value): value is string => typeof value === "string" && value.length <= 1000);
        draftStores.current.set(item.id, store);
        const recovery = store.recover();
        if (recovery) found[item.id] = recovery;
      }
      setRecoveries(found);
    }, 0);
    return () => clearTimeout(timer);
    // Inspect drafts once per editor visit; save revalidation must not reopen recovery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);
  const textSaves = useRef(new Map<string, ReturnType<typeof createAutosave<string>>>());
  useEffect(() => {
    const saves = textSaves.current;
    return () => { for (const save of saves.values()) void save.flush(); };
  }, []);
  const [textStates, setTextStates] = useState<Record<string, AutosaveState>>({});


  function saveText(id: string, text: string) {
    let save = textSaves.current.get(id);
    if (!save) {
      save = createAutosave(async (value: string) => {
        const result = await updateItemText({ id, text: value });
        if (!result.ok) throw new Error(result.error);
        draftStores.current.get(id)?.saved(value);
      }, (state) => setTextStates((current) => ({ ...current, [id]: state })));
      textSaves.current.set(id, save);
    }
    const original = items.find((item) => item.id === id)?.text ?? "";
    productDraft(id, original).persist(text);
    setTexts((current) => ({ ...current, [id]: text }));
    save.schedule(text);
  }
  const [draft, setDraft] = useState("");
  const [failedAdds, setFailedAdds] = useState<{ id: string; text: string }[]>([]);
  const failedAddsRef = useRef(failedAdds);
  function changeFailedAdds(change: (current: { id: string; text: string }[]) => { id: string; text: string }[]) {
    failedAddsRef.current = change(failedAddsRef.current);
    setFailedAdds(failedAddsRef.current);
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      const snapshot = pendingAdds.snapshot();
      setDraft(snapshot.input);
      failedAddsRef.current = snapshot.additions;
      setFailedAdds(snapshot.additions);
    }, 0);
    return () => clearTimeout(timer);
  }, [pendingAdds]);
  const operations = useRef(new Set<Promise<boolean>>());
  useImperativeHandle(saveRef, () => ({
    isDirty: () => failedAddsRef.current.length > 0 || operations.current.size > 0 || [...textSaves.current.values()].some((save) => save.isDirty()),
    flush: async () => {
      const results = await Promise.all([...textSaves.current.values()].map((save) => save.flush()).concat([...operations.current]));
      return results.every(Boolean) && failedAddsRef.current.length === 0;
    },
  }), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [visibleItems, changeItems] = useOptimistic(items, (current, change: Change) => {
    switch (change.type) {
      case "add": return [...current, change.item];
      case "toggle": return current.map((item) => item.id === change.id ? { ...item, done: change.done } : item);
      case "delete": return current.filter((item) => item.id !== change.id);
      case "clear": return current.filter((item) => !item.done);
    }
  });
  const remaining = visibleItems.filter((item) => !item.done);
  const purchased = visibleItems.filter((item) => item.done);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, change?: Change, onFailure?: () => void) {
    startTransition(async () => {
      if (change) changeItems(change);
      const operation = (async () => {
        try {
          const result = await fn();
          if (!result.ok) throw new Error(result.error ?? "Promena nije sačuvana.");
          return true;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Promena nije sačuvana. Pokušaj ponovo.");
          onFailure?.();
          return false;
        }
      })();
      operations.current.add(operation);
      try { await operation; } finally { operations.current.delete(operation); }
    });
  }

  function add(text = draft.trim(), retryId?: string) {
    if (!text) return;
    const id = retryId ?? `draft-${crypto.randomUUID()}`;
    // Persist before sending: a lost response does not prove the write failed.
    pendingAdds.stage(id, text);
    if (retryId) changeFailedAdds((current) => current.filter((item) => item.id !== retryId));
    else { setDraft(""); pendingAdds.setInput(""); }
    inputRef.current?.focus();
    run(async () => {
      const result = await addItem({ noteId, text });
      if (result.ok) pendingAdds.remove(id);
      return result;
    }, {
      type: "add", item: { id, text, done: false, position: 0 },
    }, () => changeFailedAdds((current) => [...current, { id, text }]));
  }

  async function removeProducts(ids: string[], remove: () => Promise<{ ok: boolean; error?: string }>) {
    await Promise.all(ids.map((id) => textSaves.current.get(id)?.flush()));
    const result = await remove();
    if (result.ok) {
      for (const id of ids) {
        textSaves.current.delete(id);
        draftStores.current.get(id)?.discard();
      }
      setTextStates((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))));
    }
    return result;
  }

  function row(item: TodoItem) {
    const saving = item.id.startsWith("draft-");
    return (
      <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2">
        <Checkbox className="size-6 shrink-0" checked={item.done} disabled={saving}
          aria-label={`Kupljeno: ${item.text}`}
          onCheckedChange={(checked) => run(() => toggleItem({ id: item.id, done: Boolean(checked) }), { type: "toggle", id: item.id, done: Boolean(checked) })} />
        <Input aria-label="Proizvod" value={texts[item.id] ?? item.text} maxLength={1000} disabled={saving || Boolean(recoveries[item.id])}
          onChange={(event) => saveText(item.id, event.target.value)}
          onBlur={() => { void textSaves.current.get(item.id)?.flush(); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); inputRef.current?.focus(); }
          }}
          className={`h-10 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-1 ${item.done ? "text-muted-foreground line-through" : ""}`} />
        {textStates[item.id] === "error" ? <Button type="button" variant="outline" size="sm" onClick={() => { void textSaves.current.get(item.id)?.flush(); }}>Ponovi čuvanje</Button> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={saving} aria-label={`Opcije za ${item.text}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onSelect={() => run(() => removeProducts([item.id], () => deleteItem({ id: item.id })), { type: "delete", id: item.id })}><Trash2 /> Obriši proizvod</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => { event.preventDefault(); add(); }} className="flex items-center gap-2">
        <Input ref={inputRef} autoFocus aria-label="Dodaj proizvod" value={draft} maxLength={1000}
          onChange={(event) => { setDraft(event.target.value); pendingAdds.setInput(event.target.value); }} placeholder="Dodaj proizvod i pritisni Enter" className="h-12 min-w-0 flex-1" />
        <Button type="submit" size="icon" className="size-12 shrink-0" disabled={!draft.trim()} aria-label="Dodaj proizvod u listu"><Plus className="size-5" /></Button>
      </form>
      {Object.entries(recoveries).map(([id, recovery]) => <div key={id} role="alert" className="space-y-2 rounded-xl border border-border p-3 text-sm">
        <p>{recovery.conflict ? "Proizvod je promenjen na serveru. Obnova zamenjuje sačuvani tekst nacrtom:" : "Pronađen je nesačuvan tekst proizvoda:"} <strong>{recovery.value || "(prazan tekst)"}</strong></p>
        <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { saveText(id, recovery.value); setRecoveries((current) => { const next = { ...current }; delete next[id]; return next; }); }}>Obnovi tekst i sačuvaj</Button><Button variant="outline" size="sm" onClick={() => { draftStores.current.get(id)?.discard(); setRecoveries((current) => { const next = { ...current }; delete next[id]; return next; }); }}>Odbaci nacrt proizvoda</Button></div>
      </div>)}
      {failedAdds.length > 0 ? <p className="text-sm text-muted-foreground">Čuvanje ovih proizvoda nije potvrđeno. Proveri listu pre ponavljanja da ne dodaš isti proizvod dvaput.</p> : null}
      {failedAdds.map((item) => <div key={item.id} role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive"><span>Nije sačuvano: {item.text}</span><Button variant="outline" size="sm" disabled={pending} onClick={() => add(item.text, item.id)}>Pokušaj ponovo</Button><Button variant="ghost" size="sm" onClick={() => { pendingAdds.remove(item.id); changeFailedAdds((current) => current.filter((failed) => failed.id !== item.id)); }}>Odbaci</Button></div>)}
      <section aria-label="Za kupovinu" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Za kupovinu · {remaining.length}</h2>
        {remaining.map(row)}
        {remaining.length === 0 ? <p className="py-3 text-sm text-muted-foreground">{purchased.length > 0 ? "Sve je kupljeno." : "Lista je prazna. Dodaj prvi proizvod."}</p> : null}
      </section>
      {purchased.length > 0 ? <section aria-label="Kupljeno" className="space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium text-muted-foreground">Kupljeno · {purchased.length}</h2><Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => removeProducts(purchased.map((item) => item.id), () => clearDoneItems({ noteId })), { type: "clear" })}><Trash2 className="size-4" /> Obriši kupljeno</Button></div>
        {purchased.map(row)}
      </section> : null}
      <p role="status" className="text-xs text-muted-foreground">{Object.values(textStates).includes("error") ? "Tekst proizvoda nije sačuvan. Ispravi unos ili ponovi čuvanje." : pending || Object.values(textStates).includes("saving") ? "Čuvanje proizvoda…" : "Proizvodi se automatski čuvaju."}</p>
    </div>
  );
}
