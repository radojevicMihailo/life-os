import type { MainSection } from "@/components/main-sections";
import { SectionLinks } from "@/components/section-links";

export function SectionOverview({ section }: { section: MainSection }) {
  const Icon = section.icon;
  return <div className="space-y-8">
    <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex items-start gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary"><Icon className="size-7" /></span>
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Life OS / Oblasti</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{section.label}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{section.description}</p></div>
      </div>
    </header>
    <SectionLinks section={section} />
  </div>;
}
