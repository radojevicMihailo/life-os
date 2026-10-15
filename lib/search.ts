/** SQL LIKE metacharacters must be literal in user-entered searches. */
export function literalSearchPattern(value: string): string {
  return `%${value.trim().slice(0, 200).replace(/[\\%_]/g, "\\$&")}%`;
}

export function listLimit(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 500) : 50;
}

export function navigationMatches(label: string, query: string): boolean {
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "dj");
  return normalize(label).includes(normalize(query.trim()));
}

export type SearchResult = { id: string; title: string; href: string; kind: string };
