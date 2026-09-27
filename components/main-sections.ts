import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Dumbbell,
  FolderKanban,
  ListTodo,
  Plane,
  Repeat,
  Settings2,
  StickyNote,
  Target,
  Timer,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type SectionLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type MainSection = SectionLink & { links: SectionLink[] };

export const sections = {
  tasks: {
    href: "/task-manager",
    label: "Zadaci",
    icon: CheckSquare,
    description: "Projekti, zadaci, planiranje i fokus.",
    links: [
      { href: "/projects", label: "Projekti", icon: FolderKanban, description: "Poveži zadatke u veće celine." },
      { href: "/tasks", label: "Zadaci", icon: ListTodo, description: "Pregledaj i organizuj zadatke." },
      { href: "/pomodoro", label: "Pomodoro", icon: Timer, description: "Vreme za fokus i odmor." },
      { href: "/calendar", label: "Kalendar", icon: CalendarDays, description: "Pogledaj dnevni raspored." },
      { href: "/context", label: "Konteksti", icon: ClipboardList, description: "Grupiši zadatke po kontekstu." },
      { href: "/priorities", label: "Prioriteti", icon: Target, description: "Odredi šta je najvažnije." },
    ],
  },
  finance: {
    href: "/finance",
    label: "Finansije",
    icon: Wallet,
    description: "Računi, transakcije, budžeti i ulaganja.",
    links: [
      { href: "/finance/transactions", label: "Transakcije", icon: ListTodo, description: "Pregled prometa." },
      { href: "/finance/accounts", label: "Računi", icon: Wallet, description: "Stanja i računi." },
      { href: "/finance/budgets", label: "Budžeti", icon: BarChart3, description: "Planiranje potrošnje." },
      { href: "/finance/goals", label: "Štednja", icon: Target, description: "Ciljevi štednje." },
      { href: "/finance/investments", label: "Investicije", icon: Wallet, description: "Portfolio i ulaganja." },
      { href: "/finance/settings", label: "Podešavanja", icon: Settings2, description: "Finansijska podešavanja." },
    ],
  },
  physical: {
    href: "/physical",
    label: "Aktivnosti",
    icon: Activity,
    description: "Treninzi, aktivnosti i planovi vežbanja.",
    links: [
      { href: "/activities", label: "Aktivnosti", icon: Dumbbell, description: "Zabeleži i pregledaj treninge." },
      { href: "/plans", label: "Planovi", icon: ClipboardList, description: "Treninzi i rasporedi." },
      { href: "/configuration", label: "Podešavanja", icon: Settings2, description: "Vežbe, oznake i grupe." },
    ],
  },
  habits: {
    href: "/habits",
    label: "Navike",
    icon: Repeat,
    description: "Svakodnevne rutine i kontinuitet.",
    links: [],
  },
  goals: {
    href: "/goals",
    label: "Ciljevi",
    icon: Target,
    description: "Važni ciljevi kroz vreme.",
    links: [],
  },
  notes: {
    href: "/notes",
    label: "Beleške",
    icon: StickyNote,
    description: "Ideje, beleške i liste.",
    links: [
      { href: "/notes/settings", label: "Podešavanja", icon: Settings2, description: "Kategorije beležaka." },
    ],
  },
  meals: {
    href: "/meals",
    label: "Ishrana",
    icon: UtensilsCrossed,
    description: "Obroci, namirnice i nutritivni ciljevi.",
    links: [
      { href: "/meals/calendar", label: "Kalendar", icon: CalendarDays, description: "Pregled unetih dana." },
      { href: "/meals/library", label: "Biblioteka", icon: ClipboardList, description: "Sačuvane namirnice i obroci." },
      { href: "/meals/templates", label: "Šabloni", icon: ListTodo, description: "Obroci koje često ponavljaš." },
      { href: "/meals/targets", label: "Ciljevi", icon: Target, description: "Nutritivni ciljevi." },
    ],
  },
  travels: {
    href: "/travels",
    label: "Putovanja",
    icon: Plane,
    description: "Putovanja i planovi za sledeće destinacije.",
    links: [],
  },
} satisfies Record<string, MainSection>;

export const mainSections: MainSection[] = Object.values(sections);
