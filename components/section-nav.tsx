"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/components/main-sections";

export function SectionNav({ area, hideOnOverview = false }: { area: "tasks" | "physical" | "meals" | "notes"; hideOnOverview?: boolean }) {
  const section = sections[area];
  const pathname = usePathname();
  if (hideOnOverview && pathname === section.href) return null;

  const destinations = [
    ...(area === "tasks" ? [] : [{ href: section.href, label: "Pregled" }]),
    ...section.links.map(({ href, label }) => ({ href, label })),
  ];
  const activeHref = destinations
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? section.href;

  return (
    <nav aria-label={`Podsekcije: ${section.label}`} className="sticky top-16 z-20 mb-7 overflow-x-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur md:top-0">
      <ul className="flex w-max min-w-full gap-1">
        {destinations.map(({ href, label }) => {
          const active = href === activeHref;
          return <li key={href} className="shrink-0 sm:flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-xl px-3 text-center text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "active-section-tab" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >{label}</Link>
          </li>;
        })}
      </ul>
    </nav>
  );
}
