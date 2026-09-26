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
    label: "Task Manager",
    icon: CheckSquare,
    description: "Projects, tasks, planning and focus time.",
    links: [
      { href: "/projects", label: "Projects", icon: FolderKanban, description: "Organize related work." },
      { href: "/tasks", label: "Tasks", icon: ListTodo, description: "See and manage your tasks." },
      { href: "/pomodoro", label: "Pomodoro", icon: Timer, description: "Time work and breaks." },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, description: "See your schedule." },
      { href: "/context", label: "Contexts", icon: ClipboardList, description: "Group tasks by context." },
      { href: "/priorities", label: "Priorities", icon: Target, description: "Manage priority levels." },
    ],
  },
  finance: {
    href: "/finance",
    label: "Finance",
    icon: Wallet,
    description: "Accounts, transactions, budgets and investments.",
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
    label: "Physical Activities",
    icon: Activity,
    description: "Activities, training plans and configuration.",
    links: [
      { href: "/activities", label: "Activities", icon: Dumbbell, description: "Log and review sessions." },
      { href: "/plans", label: "Plans", icon: ClipboardList, description: "Workouts and splits." },
      { href: "/configuration", label: "Configuration", icon: Settings2, description: "Exercises, tags and groups." },
    ],
  },
  habits: {
    href: "/habits",
    label: "Habits",
    icon: Repeat,
    description: "Daily routines and streaks.",
    links: [],
  },
  goals: {
    href: "/goals",
    label: "Goals",
    icon: Target,
    description: "Long-term objectives.",
    links: [],
  },
  notes: {
    href: "/notes",
    label: "Notes",
    icon: StickyNote,
    description: "Notes and todo lists.",
    links: [],
  },
  meals: {
    href: "/meals",
    label: "Meals Diary",
    icon: UtensilsCrossed,
    description: "Meals, recipes and targets.",
    links: [
      { href: "/meals/calendar", label: "Calendar", icon: CalendarDays, description: "Browse logged days." },
      { href: "/meals/library", label: "Library", icon: ClipboardList, description: "Saved foods and meals." },
      { href: "/meals/templates", label: "Templates", icon: ListTodo, description: "Reusable meals." },
      { href: "/meals/targets", label: "Targets", icon: Target, description: "Nutrition goals." },
    ],
  },
  travels: {
    href: "/travels",
    label: "Travels",
    icon: Plane,
    description: "Trips and travel plans.",
    links: [],
  },
} satisfies Record<string, MainSection>;

export const mainSections: MainSection[] = Object.values(sections);
