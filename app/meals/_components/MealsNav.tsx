"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/meals", label: "Day", match: (p: string) => p === "/meals" || /^\/meals\/\d{4}-\d{2}-\d{2}$/.test(p) },
  { href: "/meals/calendar", label: "Calendar", match: (p: string) => p.startsWith("/meals/calendar") },
  { href: "/meals/library", label: "Library", match: (p: string) => p.startsWith("/meals/library") },
  { href: "/meals/templates", label: "Templates", match: (p: string) => p.startsWith("/meals/templates") },
];

export function MealsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b mb-4">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px",
              active
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
