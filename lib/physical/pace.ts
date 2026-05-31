export function computePace(distanceKm: number, durationSec: number): number | null {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationSec)) return null;
  if (distanceKm <= 0 || durationSec < 0) return null;
  return Math.round(durationSec / distanceKm);
}
