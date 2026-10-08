import type { SetEntry } from "./types";

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
    const effReps = s.perSide === true ? (s.reps ?? 0) * 2 : (s.reps ?? 0);
    totalVolume += (s.weight ?? 0) * effReps;
    if ((s.weight ?? 0) > maxWeight) maxWeight = s.weight ?? 0;
    totalReps += effReps;
  }
  return { totalVolume, maxWeight, totalReps, setCount: sets.length };
}
