import "server-only";
import { GoogleAuthError, GoogleFetchError } from "./errors";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendarInfo = {
  id: string;
  summary: string;
  primary: boolean;
};

export type GoogleCalendarInfoWithAccount = GoogleCalendarInfo & {
  accountIdx: number;
  accountLabel: string;
};

export type GoogleEvent = {
  id: string;
  calendarId: string;
  summary: string;
  startISO: string;
  endISO?: string;
  hasTime: boolean;
};

type TokenCache = { token: string; expiresAt: number };
const cached: Map<number, TokenCache> = new Map();

function getRefreshTokens(): string[] {
  const multi = process.env.GOOGLE_REFRESH_TOKENS;
  if (multi) {
    return multi
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  const single = process.env.GOOGLE_REFRESH_TOKEN;
  return single ? [single] : [];
}

function getAccountLabels(): string[] {
  const raw = process.env.GOOGLE_ACCOUNT_LABELS;
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim());
}

export function getAccountCount(): number {
  return getRefreshTokens().length;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      getRefreshTokens().length > 0,
  );
}

export async function getAccessToken(accountIdx = 0): Promise<string> {
  const tokens = getRefreshTokens();
  const refreshToken = tokens[accountIdx];
  if (!refreshToken) throw new GoogleAuthError(`no refresh token for account ${accountIdx}`);
  const hit = cached.get(accountIdx);
  if (hit && hit.expiresAt - 60_000 > Date.now()) return hit.token;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(`token refresh failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached.set(accountIdx, {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
  return json.access_token;
}

async function apiGet<T>(path: string, accountIdx = 0): Promise<T> {
  const token = await getAccessToken(accountIdx);
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    cached.delete(accountIdx);
    throw new GoogleAuthError(`google api auth failed: ${res.status}`);
  }
  if (!res.ok) {
    throw new GoogleFetchError(`google api ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listCalendars(accountIdx = 0): Promise<GoogleCalendarInfo[]> {
  type Resp = { items?: { id: string; summary?: string; primary?: boolean }[] };
  const json = await apiGet<Resp>("/users/me/calendarList", accountIdx);
  return (json.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    primary: Boolean(c.primary),
  }));
}

export async function listAllCalendars(): Promise<GoogleCalendarInfoWithAccount[]> {
  const count = getAccountCount();
  const labels = getAccountLabels();
  const results = await Promise.allSettled(
    Array.from({ length: count }, (_, i) => listCalendars(i)),
  );
  const out: GoogleCalendarInfoWithAccount[] = [];
  results.forEach((r, idx) => {
    if (r.status !== "fulfilled") {
      console.error(`[google] listCalendars account ${idx} failed`, r.reason);
      return;
    }
    const primary = r.value.find((c) => c.primary);
    const label = labels[idx] ?? primary?.summary ?? `Account ${idx + 1}`;
    for (const c of r.value) out.push({ ...c, accountIdx: idx, accountLabel: label });
  });
  return out;
}

export async function listEvents(
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
  accountIdx = 0,
): Promise<GoogleEvent[]> {
  type RawEvent = {
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  type Resp = { items?: RawEvent[] };
  const qs = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
  });
  const json = await apiGet<Resp>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
    accountIdx,
  );
  return (json.items ?? []).map((e) => {
    const startDateTime = e.start?.dateTime;
    const startDate = e.start?.date;
    const endDateTime = e.end?.dateTime;
    const endDate = e.end?.date;
    const hasTime = Boolean(startDateTime);
    const startISO = startDateTime ?? (startDate ? `${startDate}T00:00:00.000Z` : "");
    const endISO = endDateTime ?? (endDate ? `${endDate}T00:00:00.000Z` : undefined);
    return {
      id: `${accountIdx}:${calendarId}:${e.id}`,
      calendarId,
      summary: e.summary ?? "(no title)",
      startISO,
      endISO,
      hasTime,
    };
  });
}
