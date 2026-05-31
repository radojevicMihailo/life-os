export function secondsToMmSs(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0:00";
  const t = Math.round(total);
  const minutes = Math.floor(t / 60);
  const seconds = t % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function mmSsToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (!match) return null;
  const m = Number(match[1]);
  const s = Number(match[2]);
  if (s >= 60) return null;
  return m * 60 + s;
}
