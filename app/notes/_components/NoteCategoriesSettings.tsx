"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNoteCategory, deleteNoteCategory, renameNoteCategory } from "../_actions/categories";

export function NoteCategoriesSettings({ categories }: { categories: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createNoteCategory(name);
      if (!result.ok) toast.error(result.error);
      else setName("");
    });
  }

  return <div className="max-w-2xl space-y-5">
    <form onSubmit={(event) => { event.preventDefault(); create(); }} className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-5">
      <label className="min-w-56 flex-1 space-y-2 text-sm font-medium">Nova kategorija<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Na primer: Ideje" /></label>
      <Button type="submit" className="self-end" disabled={pending || !name.trim()}>Dodaj kategoriju</Button>
    </form>
    <ul className="space-y-2">{categories.map((category) => <CategoryRow key={category.id} category={category} />)}</ul>
    {categories.length === 0 ? <p className="text-sm text-muted-foreground">Još nema kategorija.</p> : null}
  </div>;
}

function CategoryRow({ category }: { category: { id: string; name: string } }) {
  const [name, setName] = useState(category.name);
  const [pending, startTransition] = useTransition();
  return <li className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
    <Input aria-label={`Naziv kategorije ${category.name}`} className="min-w-44 flex-1" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
    <Button size="sm" variant="outline" disabled={pending || !name.trim() || name.trim() === category.name} onClick={() => startTransition(async () => { const result = await renameNoteCategory(category.id, name); if (!result.ok) toast.error(result.error); })}>Sačuvaj naziv</Button>
    <Button size="sm" variant="destructive" disabled={pending} onClick={() => startTransition(async () => { const result = await deleteNoteCategory(category.id); if (!result.ok) toast.error(result.error); })}>Obriši</Button>
  </li>;
}
