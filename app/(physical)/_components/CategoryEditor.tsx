"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCategory, removeCategory, renameCategory } from "../_actions/categories";
import type { Category } from "@/db/schema/physical";

export function CategoryEditor({
  modalityId,
  categories,
}: {
  modalityId: string;
  categories: Category[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addCategory({
        modalityId,
        name,
        sortOrder: categories.length,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
    });
  }

  function rename(cat: Category, value: string) {
    startTransition(async () => {
      const result = await renameCategory({ id: cat.id, name: value });
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(cat: Category) {
    if (!confirm(`Remove "${cat.name}"? Exercises in this category lose their category.`)) return;
    startTransition(async () => {
      const result = await removeCategory(cat.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Input
              defaultValue={c.name}
              onBlur={(e) => {
                if (e.target.value !== c.name) rename(c, e.target.value);
              }}
              className="max-w-xs"
            />
            <Button size="icon" variant="ghost" onClick={() => remove(c)} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="max-w-xs" />
        <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add category
        </Button>
      </div>
    </div>
  );
}
