"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fmtEur } from "@/lib/finance/overview/formatters";
import type { CategoryBreakdownRow } from "@/lib/finance/overview/types";

export function CategoryBreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: CategoryBreakdownRow[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 text-sm font-medium border-b">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nema podataka</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((cat) => {
              const isOpen = open.has(cat.categoryId);
              return (
                <Fragment key={cat.categoryId}>
                  <tr
                    className="border-t cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(cat.categoryId)}
                  >
                    <td className="px-4 py-2 w-6">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-2 py-2">{cat.categoryName}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {fmtEur(cat.total)}
                    </td>
                  </tr>
                  {isOpen &&
                    cat.subRows.map((sub) => (
                      <tr
                        key={`${cat.categoryId}::${sub.subcategoryId ?? "null"}`}
                        className="border-t bg-muted/20"
                      >
                        <td className="px-4 py-1.5" />
                        <td className="px-2 py-1.5 pl-6 text-muted-foreground">
                          {sub.subcategoryName}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {fmtEur(sub.total)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
