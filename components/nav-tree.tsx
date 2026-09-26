"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainSections } from "@/components/main-sections";

export function NavTree() {
  const pathname = usePathname() ?? "/";

  return (
    <ul className="space-y-0.5">
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
              className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                  : "text-sidebar-foreground/80"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{section.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
