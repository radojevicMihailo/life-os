import type { ProjectStatus, TaskStatus } from "@/db/schema/tasks";
import type { TravelRegion, TravelStatus } from "@/db/schema/travels";
import type { GoalStatus } from "@/db/schema/goals";

export const taskStatusColors: Record<TaskStatus | "active" | "all", string> = {
  active: "border-sky-500/70 bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
  backlog: "border-slate-400/60 bg-slate-100 text-slate-900 dark:bg-slate-400/20 dark:text-slate-100",
  in_progress: "border-blue-400/70 bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100",
  waiting_for: "border-amber-400/70 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
  done: "border-emerald-400/70 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
  canceled: "border-rose-400/70 bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100",
  all: "border-violet-400/70 bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100",
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  planning: "border-slate-400/70 bg-slate-500/25 text-slate-100",
  active: "border-blue-400/70 bg-blue-500/30 text-blue-50",
  on_hold: "border-amber-400/70 bg-amber-500/25 text-amber-50",
  completed: "border-emerald-400/70 bg-emerald-500/25 text-emerald-50",
  canceled: "border-rose-400/70 bg-rose-500/25 text-rose-50",
};

export const goalStatusColors: Record<GoalStatus, string> = {
  active: "border-blue-400/70 bg-blue-500/25 text-blue-50",
  done: "border-emerald-400/70 bg-emerald-500/25 text-emerald-50",
  paused: "border-amber-400/70 bg-amber-500/25 text-amber-50",
  canceled: "border-rose-400/70 bg-rose-500/25 text-rose-50",
};

export const travelRegionColors: Record<TravelRegion, string> = {
  srbija: "border-rose-500/60 bg-rose-200 text-rose-900 dark:border-rose-400/65 dark:bg-rose-500/25 dark:text-rose-100",
  okolne_drzave: "border-orange-500/60 bg-orange-200 text-orange-900 dark:border-orange-400/65 dark:bg-orange-500/25 dark:text-orange-100",
  evropa: "border-sky-500/60 bg-sky-200 text-sky-900 dark:border-sky-400/65 dark:bg-sky-500/25 dark:text-sky-100",
  svet: "border-violet-500/60 bg-violet-200 text-violet-900 dark:border-violet-400/65 dark:bg-violet-500/25 dark:text-violet-100",
};

export const travelStatusColors: Record<TravelStatus, string> = {
  idea: "border-slate-500/60 bg-slate-200 text-slate-900 dark:border-slate-400/65 dark:bg-slate-500/25 dark:text-slate-100",
  planning: "border-amber-500/60 bg-amber-200 text-amber-900 dark:border-amber-400/65 dark:bg-amber-500/25 dark:text-amber-100",
  booked: "border-blue-500/60 bg-blue-200 text-blue-900 dark:border-blue-400/65 dark:bg-blue-500/25 dark:text-blue-100",
  done: "border-emerald-500/60 bg-emerald-200 text-emerald-900 dark:border-emerald-400/65 dark:bg-emerald-500/25 dark:text-emerald-100",
};
