import Link from "next/link";
import {
  CheckSquare,
  Wallet,
  Activity,
  Repeat,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-static";

type Module = {
  href: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
};

const modules: Module[] = [
  {
    href: "/projects",
    label: "Task Manager",
    icon: CheckSquare,
    blurb: "Projects and tasks.",
  },
  { href: "/finance", label: "Finance", icon: Wallet, blurb: "Money in, money out." },
  {
    href: "/physical",
    label: "Physical Activities",
    icon: Activity,
    blurb: "Workouts and movement.",
  },
  { href: "/habits", label: "Habits", icon: Repeat, blurb: "Daily routines, streaks." },
  { href: "/goals", label: "Goals", icon: Target, blurb: "Long-horizon objectives." },
  { href: "/meals", label: "Meals Diary", icon: UtensilsCrossed, blurb: "What you ate, when." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Life OS</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A personal operating system for the parts of life worth tracking. One place for tasks,
          finance, fitness, habits, goals, and meals — each module independent, all sharing the
          same shell.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col gap-2 rounded-md border bg-card p-4 transition hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">How it works</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>· Pick a module from the sidebar or above.</li>
          <li>· Each module owns its own data and pages.</li>
          <li>· Task Manager is the most built out — start there.</li>
        </ul>
      </section>
    </div>
  );
}
