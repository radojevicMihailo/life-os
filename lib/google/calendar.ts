import "server-only";
import { GoogleAuthError, GoogleFetchError } from "./errors";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendarInfo = {
  id: string;
  summary: string;
  primary: boolean;
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
let cached: TokenCache | null = null;

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
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
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    cached = null;
    throw new GoogleAuthError(`google api auth failed: ${res.status}`);
  }
  if (!res.ok) {
    throw new GoogleFetchError(`google api ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listCalendars(): Promise<GoogleCalendarInfo[]> {
  type Resp = { items?: { id: string; summary?: string; primary?: boolean }[] };
  const json = await apiGet<Resp>("/users/me/calendarList");
  return (json.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    primary: Boolean(c.primary),
  }));
}

export async function listEvents(
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
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
      id: `${calendarId}:${e.id}`,
      calendarId,
      summary: e.summary ?? "(no title)",
      startISO,
      endISO,
      hasTime,
    };
  });
}
