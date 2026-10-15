"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, Plus, Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { mainSections } from "@/components/main-sections";
import { navigationMatches, type SearchResult } from "@/lib/search";

export const OPEN_COMMANDS = "life-os:commands";
const quickLinks = [
  { href: "/tasks?new=1", title: "Novi zadatak" },
  { href: "/finance/transactions#new-transaction", title: "Novi trošak" },
  { href: "/notes?new=1", title: "Nova beleška" },
  { href: "/meals?new=1", title: "Novi obrok" },
];
const destinations = [{ href: "/", label: "Danas" }, ...mainSections.flatMap((section) => [section, ...section.links]), { href: "/settings", label: "Podešavanja" }];

export function CommandPalette() {
  const pathname = usePathname();
  const params = useSearchParams();
  const location = `${pathname}?${params.toString()}`;
  const [dialog, setDialog] = useState({ location, open: false });
  const open = dialog.open && dialog.location === location;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => setDialog((current) => ({ location, open: typeof value === "function" ? value(current.open && current.location === location) : value }));
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ query: string; items: SearchResult[]; error?: string } | null>(null);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    function show() { setDialog({ location, open: true }); }
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setDialog((current) => ({ location, open: !(current.open && current.location === location) })); }
      if (event.key === "?" && !(event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable))) { setHelp(true); setDialog({ location, open: true }); }
    }
    window.addEventListener(OPEN_COMMANDS, show);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener(OPEN_COMMANDS, show); window.removeEventListener("keydown", key); };
  }, [location]);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setResult({ query, items: body.items });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ query, items: [], error: error instanceof Error ? error.message : "Pretraga nije dostupna." });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query]);
  const items = result?.query === query ? result.items : [];
  const error = result?.query === query ? result.error : undefined;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>Pretraži i pokreni</DialogTitle></DialogHeader>
      <div className="relative"><Search aria-hidden className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input autoFocus aria-label="Pretraži aplikaciju" placeholder="Zadaci, projekti, beleške, ekrani…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 pl-10" /></div>
      <div className="space-y-1" aria-label="Brze akcije">{quickLinks.filter((item) => navigationMatches(item.title, query)).map((item) => <Link onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" key={item.href} href={item.href}><Plus aria-hidden className="size-4 text-primary" />{item.title}</Link>)}</div>
      <div className="space-y-1" aria-label="Ekrani">{destinations.filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index && navigationMatches(item.label, query)).map((item) => <Link onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" key={item.href} href={item.href}>{item.label}<span className="text-xs text-muted-foreground">Ekran</span></Link>)}</div>
      {query.trim().length >= 2 ? <div className="space-y-1 border-t border-border pt-3" aria-live="polite">
        {error ? <p role="alert" className="px-3 text-sm text-destructive">{error}</p> : result?.query !== query ? <p className="px-3 text-sm text-muted-foreground">Pretraživanje…</p> : items.length === 0 ? <p className="px-3 text-sm text-muted-foreground">Nema zadataka, projekata ili beležaka za ovu pretragu.</p> : items.map((item) => <Link onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" key={`${item.kind}:${item.id}`} href={item.href}><span className="truncate">{item.title}</span><span className="shrink-0 text-xs text-muted-foreground">{item.kind}</span></Link>)}
      </div> : null}
      <button onClick={() => setHelp((value) => !value)} className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Keyboard className="size-4" />Tastaturne prečice</button>
      {help ? <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-sm"><dt>⌘K / Ctrl+K</dt><dd>Otvori pretragu</dd><dt>G pa D / T / P</dt><dd>Danas / Zadaci / Projekti</dd><dt>Esc</dt><dd>Zatvori dijalog</dd><dt>Tab / Shift+Tab</dt><dd>Sledeća / prethodna akcija</dd></dl> : null}
    </DialogContent>
  </Dialog>;
}

export function SearchButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COMMANDS))} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-background/40 px-3 text-sm text-muted-foreground hover:bg-accent"><Search aria-hidden className="size-4" /><span>Pretraži</span><kbd className="ml-auto text-xs">⌘K</kbd></button>;
}
