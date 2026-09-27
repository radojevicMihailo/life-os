import type { ProjectStatus, TaskStatus } from "@/db/schema/tasks";
import type { TravelRegion, TravelStatus } from "@/db/schema/travels";
import type { GoalStatus } from "@/db/schema/goals";

export const taskStatusColors: Record<TaskStatus | "active" | "all", string> = {
  active: "border-sky-500/70 bg-sky-500/20 text-sky-100",
  backlog: "border-slate-400/60 bg-slate-400/20 text-slate-100",
  in_progress: "border-blue-400/70 bg-blue-500/25 text-blue-100",
  waiting_for: "border-amber-400/70 bg-amber-500/20 text-amber-100",
  done: "border-emerald-400/70 bg-emerald-500/20 text-emerald-100",
  canceled: "border-rose-400/70 bg-rose-500/20 text-rose-100",
  all: "border-violet-400/70 bg-violet-500/20 text-violet-100",
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
  srbija: "border-rose-400/65 bg-rose-500/15 text-rose-100",
  okolne_drzave: "border-orange-400/65 bg-orange-500/15 text-orange-100",
  evropa: "border-sky-400/65 bg-sky-500/15 text-sky-100",
  svet: "border-violet-400/65 bg-violet-500/15 text-violet-100",
};

export const travelStatusColors: Record<TravelStatus, string> = {
  idea: "border-slate-400/65 bg-slate-500/15 text-slate-100",
  planning: "border-amber-400/65 bg-amber-500/15 text-amber-100",
  booked: "border-blue-400/65 bg-blue-500/15 text-blue-100",
  done: "border-emerald-400/65 bg-emerald-500/15 text-emerald-100",
};
