"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { addItem, toggleItem, updateItemText, deleteItem, clearDoneItems } from "../_actions/notes";

export type TodoItem = { id: string; text: string; done: boolean; position: number };
type Change = { type: "add"; item: TodoItem } | { type: "toggle"; id: string; done: boolean } | { type: "delete"; id: string } | { type: "clear" };

export function TodoItems({ noteId, items }: { noteId: string; items: TodoItem[] }) {
  const [draft, setDraft] = useState("");
  const [failedAdds, setFailedAdds] = useState<{ id: string; text: string }[]>([]);
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
      try {
        const result = await fn();
        if (!result.ok) throw new Error(result.error ?? "Promena nije sačuvana.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Promena nije sačuvana. Pokušaj ponovo.");
        onFailure?.();
      }
    });
  }

  function add(text = draft.trim(), retryId?: string) {
    if (!text) return;
    const id = `draft-${crypto.randomUUID()}`;
    if (retryId) setFailedAdds((current) => current.filter((item) => item.id !== retryId));
    else setDraft("");
    inputRef.current?.focus();
    run(() => addItem({ noteId, text }), {
      type: "add", item: { id, text, done: false, position: 0 },
    }, () => setFailedAdds((current) => [...current, { id, text }]));
  }

  function row(item: TodoItem) {
    const saving = item.id.startsWith("draft-");
    return (
      <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2">
        <Checkbox className="size-6 shrink-0" checked={item.done} disabled={saving}
          aria-label={`Kupljeno: ${item.text}`}
          onCheckedChange={(checked) => run(() => toggleItem({ id: item.id, done: Boolean(checked) }), { type: "toggle", id: item.id, done: Boolean(checked) })} />
        <Input aria-label="Proizvod" defaultValue={item.text} maxLength={1000} disabled={saving}
          onBlur={(event) => {
            const text = event.target.value.trim();
            if (!text) { event.target.value = item.text; return; }
            if (text !== item.text) run(() => updateItemText({ id: item.id, text }));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); inputRef.current?.focus(); }
          }}
          className={`h-10 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-1 ${item.done ? "text-muted-foreground line-through" : ""}`} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={saving} aria-label={`Opcije za ${item.text}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onSelect={() => run(() => deleteItem({ id: item.id }), { type: "delete", id: item.id })}><Trash2 /> Obriši proizvod</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => { event.preventDefault(); add(); }} className="flex items-center gap-2">
        <Input ref={inputRef} autoFocus aria-label="Dodaj proizvod" value={draft} maxLength={1000}
          onChange={(event) => setDraft(event.target.value)} placeholder="Dodaj proizvod i pritisni Enter" className="h-12 min-w-0 flex-1" />
        <Button type="submit" size="icon" className="size-12 shrink-0" disabled={!draft.trim()} aria-label="Dodaj proizvod u listu"><Plus className="size-5" /></Button>
      </form>
      {failedAdds.map((item) => <div key={item.id} role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive"><span>Nije sačuvano: {item.text}</span><Button variant="outline" size="sm" disabled={pending} onClick={() => add(item.text, item.id)}>Pokušaj ponovo</Button></div>)}
      <section aria-label="Za kupovinu" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Za kupovinu · {remaining.length}</h2>
        {remaining.map(row)}
        {remaining.length === 0 ? <p className="py-3 text-sm text-muted-foreground">{purchased.length > 0 ? "Sve je kupljeno." : "Lista je prazna. Dodaj prvi proizvod."}</p> : null}
      </section>
      {purchased.length > 0 ? <section aria-label="Kupljeno" className="space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium text-muted-foreground">Kupljeno · {purchased.length}</h2><Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => clearDoneItems({ noteId }), { type: "clear" })}><Trash2 className="size-4" /> Obriši kupljeno</Button></div>
        {purchased.map(row)}
      </section> : null}
      <p role="status" className="text-xs text-muted-foreground">{pending ? "Čuvanje proizvoda…" : "Proizvodi se automatski čuvaju."}</p>
    </div>
  );
}
