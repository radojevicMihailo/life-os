import Link from "next/link";
import type { MainSection } from "@/components/main-sections";

export function SectionLinks({ section, dark = false }: { section: MainSection; dark?: boolean }) {
  if (section.links.length === 0) return null;

  return (
    <section aria-label={`${section.label} sections`} className="space-y-3">
      <h2 className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
        Istraži oblast
      </h2>
      <div className={`grid gap-3 sm:grid-cols-2 ${section.href === "/meals" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {section.links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-2xl border p-5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${dark ? "border-white/10 bg-white/[0.04] hover:border-blue-400/60 hover:bg-blue-500/10" : "bg-card hover:border-primary/50 hover:bg-accent"}`}
            >
              <div className="flex items-center gap-2 text-base font-medium">
                <Icon className="size-4" />
                <span>{link.label}</span>
              </div>
              <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                {link.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
