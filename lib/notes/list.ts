export const NOTES_PAGE_SIZE = 30;
export const NOTE_PREVIEW_LENGTH = 240;
export type NoteListFilters = { query: string; category: string; page: number };
type SearchParams = Record<string, string | string[] | undefined>;

export function escapeNoteSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function noteListFilters(params: SearchParams): NoteListFilters {
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 500) : "";
  const category = typeof params.category === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.category) ? params.category : "all";
  const rawPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  return { query, category, page };
}

export function noteListHref(filters: NoteListFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);
  if (page > 1) params.set("page", String(page));
  return `/notes${params.size ? `?${params}` : ""}`;
}
