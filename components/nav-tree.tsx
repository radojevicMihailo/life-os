"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";
import { mainSections } from "@/components/main-sections";

const navItemClass = "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground";

export function NavTree() {
  const pathname = usePathname() ?? "/";

  return (
    <div className="space-y-3">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={navItemClass}>
        <House aria-hidden className="size-4 shrink-0" />
        Danas
      </Link>
      <ul className="space-y-1 border-t border-sidebar-border pt-3">
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
              <Link href={section.href} aria-current={active ? "page" : undefined} className={navItemClass}>
                <Icon aria-hidden className="size-4 shrink-0" />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
