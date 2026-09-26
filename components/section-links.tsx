import Link from "next/link";
import type { MainSection } from "@/components/main-sections";

export function SectionLinks({ section, dark = false }: { section: MainSection; dark?: boolean }) {
  if (section.links.length === 0) return null;

  return (
    <section aria-label={`${section.label} sections`} className="space-y-3">
      <h2 className={`text-sm font-medium ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
        Sections
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg border p-4 transition ${dark ? "border-white/10 bg-white/[0.04] hover:bg-white/10" : "bg-card hover:bg-accent"}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4" />
                <span>{link.label}</span>
              </div>
              <p className={`mt-2 text-xs ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
                {link.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
