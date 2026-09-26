import Link from "next/link";
import { mainSections } from "@/components/main-sections";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Life OS</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One place for your tasks, finances, activities, habits, goals, notes, meals and travels.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mainSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group flex flex-col gap-2 rounded-md border bg-card p-4 transition hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{section.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
