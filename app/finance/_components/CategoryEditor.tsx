"use client";

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCategory, removeCategory, renameCategory } from "../_actions/categories";
import {
  addSubcategory,
  removeSubcategory,
  renameSubcategory,
} from "../_actions/subcategories";
import type {
  CategoryKind,
  TransactionCategory,
  TransactionSubcategory,
} from "@/db/schema/finance";

export function CategoryEditor({
  kind,
  title,
  hint,
  categories,
  subcategories,
}: {
  kind: CategoryKind;
  title: string;
  hint?: string;
  categories: TransactionCategory[];
  subcategories: TransactionSubcategory[];
}) {
  const [newCat, setNewCat] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [subInput, setSubInput] = useState<Record<string, string>>({});

  async function handleAddCat() {
    const name = newCat.trim();
    if (!name) return;
    const r = await addCategory({ kind, name, sortOrder: categories.length });
    if (!r.ok) toast.error(r.error);
    else setNewCat("");
  }

  async function handleRenameCat(id: string, next: string) {
    const r = await renameCategory({ id, name: next });
    if (!r.ok) toast.error(r.error);
  }

  async function handleRemoveCat(c: TransactionCategory) {
    const subs = subcategories.filter((s) => s.categoryId === c.id);
    const msg = subs.length
      ? `Remove "${c.name}" and ${subs.length} subcategory(ies)?`
      : `Remove "${c.name}"?`;
    if (!confirm(msg)) return;
    const r = await removeCategory(c.id);
    if (!r.ok) toast.error(r.error);
  }

  async function handleAddSub(categoryId: string) {
    const name = (subInput[categoryId] ?? "").trim();
    if (!name) return;
    const existing = subcategories.filter((s) => s.categoryId === categoryId).length;
    const r = await addSubcategory({ categoryId, name, sortOrder: existing });
    if (!r.ok) toast.error(r.error);
    else setSubInput((s) => ({ ...s, [categoryId]: "" }));
  }

  async function handleRenameSub(id: string, next: string) {
    const r = await renameSubcategory({ id, name: next });
    if (!r.ok) toast.error(r.error);
  }

  async function handleRemoveSub(s: TransactionSubcategory) {
    if (!confirm(`Remove subcategory "${s.name}"?`)) return;
    const r = await removeSubcategory(s.id);
    if (!r.ok) toast.error(r.error);
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <ul className="space-y-2">
        {categories.map((c) => {
          const subs = subcategories.filter((s) => s.categoryId === c.id);
          const isOpen = open[c.id] ?? false;
          return (
            <li key={c.id} className="rounded-md border">
              <div className="flex items-center gap-2 p-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setOpen((o) => ({ ...o, [c.id]: !isOpen }))}
                  aria-label="Toggle subcategories"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== c.name) handleRenameCat(c.id, v);
                  }}
                  className="flex-1 min-w-0"
                />
                <span className="text-xs text-muted-foreground">{subs.length}</span>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveCat(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {isOpen && (
                <div className="border-t bg-muted/30 p-2 space-y-2">
                  <ul className="space-y-1">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <Input
                          defaultValue={s.name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== s.name) handleRenameSub(s.id, v);
                          }}
                          className="flex-1 min-w-0"
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveSub(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Input
                      value={subInput[c.id] ?? ""}
                      onChange={(e) =>
                        setSubInput((m) => ({ ...m, [c.id]: e.target.value }))
                      }
                      placeholder="New subcategory"
                      className="flex-1 min-w-0"
                    />
                    <Button size="sm" onClick={() => handleAddSub(c.id)}>
                      <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category"
          className="flex-1 min-w-0"
        />
        <Button size="sm" onClick={handleAddCat} disabled={!newCat.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  );
}
