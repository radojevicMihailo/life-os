"use client";

import { SimpleListEditor, type SimpleItem } from "./SimpleListEditor";
import { addCategory, removeCategory, renameCategory } from "../_actions/categories";
import type { CategoryKind, TransactionCategory } from "@/db/schema/finance";

export function CategoryEditor({
  kind,
  title,
  hint,
  categories,
}: {
  kind: CategoryKind;
  title: string;
  hint?: string;
  categories: TransactionCategory[];
}) {
  const items: SimpleItem[] = categories.map((c) => ({ id: c.id, label: c.name }));
  return (
    <SimpleListEditor
      title={title}
      hint={hint}
      items={items}
      placeholder="New category (e.g. Grupa-Naziv)"
      itemColumns={3}
      onAdd={(name, sortOrder) => addCategory({ kind, name, sortOrder })}
      onRename={(id, name) => renameCategory({ id, name })}
      onRemove={(id) => removeCategory(id)}
    />
  );
}
