export function secondsToHhmmss(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "00:00:00";
  const t = Math.round(total);
  const hours = Math.floor(t / 3600);
  const minutes = Math.floor((t % 3600) / 60);
  const seconds = t % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function hhmmssToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const match = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

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
  const match = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (!match) return null;
  const m = Number(match[1]);
  const s = Number(match[2]);
  if (s >= 60) return null;
  return m * 60 + s;
}
