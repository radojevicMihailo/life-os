"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";
import { mainSections } from "@/components/main-sections";

export function NavTree() {
  const pathname = usePathname() ?? "/";

  return (
    <div className="space-y-5">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${pathname === "/" ? "border-primary/60 bg-primary/20 text-foreground shadow-[inset_0_0_20px_rgba(35,123,255,0.12)]" : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
      >
        <House className="size-4 shrink-0" />
        <span>Danas</span>
      </Link>
      <div>
        <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Oblasti</p>
        <ul className="space-y-1">
      {mainSections.map((section) => {
        const Icon = section.icon;
        const active =
          pathname === section.href ||
          pathname.startsWith(`${section.href}/`) ||
          section.links.some(
            (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
          );

        return (
          <li key={section.href}>
            <Link
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                active
                  ? "border-primary/50 bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "border-transparent text-sidebar-foreground/75"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{section.label}</span>
            </Link>
          </li>
        );
      })}
        </ul>
      </div>
    </div>
  );
}
