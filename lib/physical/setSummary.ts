import type { SetEntry } from "@/db/schema/physical";

export type SetSummary = {
  totalVolume: number;
  maxWeight: number;
  totalReps: number;
  setCount: number;
};

export function setSummary(sets: SetEntry[]): SetSummary {
  let totalVolume = 0;
  let maxWeight = 0;
  let totalReps = 0;
  for (const s of sets) {
    totalVolume += s.weight * s.reps;
    if (s.weight > maxWeight) maxWeight = s.weight;
    totalReps += s.reps;
  }
  return { totalVolume, maxWeight, totalReps, setCount: sets.length };
}
