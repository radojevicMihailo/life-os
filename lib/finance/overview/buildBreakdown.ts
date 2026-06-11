import type { CategoryBreakdownRow, FlatBreakdownInput } from "./types";

const NO_SUB = "(bez podkategorije)";

export function buildBreakdown(rows: FlatBreakdownInput[]): CategoryBreakdownRow[] {
  const map = new Map<string, CategoryBreakdownRow>();
  for (const r of rows) {
    const key = `${r.kind}::${r.categoryId}`;
    let cat = map.get(key);
    if (!cat) {
      cat = {
        kind: r.kind,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        total: 0,
        subRows: [],
      };
      map.set(key, cat);
    }
    cat.total += r.eur;
    const subKey = r.subcategoryId ?? "__null__";
    let sub = cat.subRows.find((s) => (s.subcategoryId ?? "__null__") === subKey);
    if (!sub) {
      sub = {
        subcategoryId: r.subcategoryId,
        subcategoryName: r.subcategoryName ?? NO_SUB,
        total: 0,
      };
      cat.subRows.push(sub);
    }
    sub.total += r.eur;
  }
  const result = Array.from(map.values());
  for (const cat of result) {
    cat.subRows.sort((a, b) => b.total - a.total);
  }
  result.sort((a, b) => b.total - a.total);
  return result;
}
