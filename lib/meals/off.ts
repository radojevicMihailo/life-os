export type OffNutriments = {
  "energy-kcal_100g"?: number;
  "energy-kj_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
};

export type OffProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
};

export type NormalizedFood = {
  offId: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

const UA = "life-os/1.0 (https://github.com/radojevicMihailo/life-os)";

function n(v: number | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function normalizeOffProduct(p: OffProduct): NormalizedFood | null {
  const name = p.product_name?.trim();
  if (!name) return null;
  const nut = p.nutriments ?? {};
  const kcalRaw =
    typeof nut["energy-kcal_100g"] === "number"
      ? nut["energy-kcal_100g"]
      : typeof nut["energy-kj_100g"] === "number"
        ? nut["energy-kj_100g"] / 4.184
        : null;
  if (kcalRaw === null) return null;
  const brand = p.brands?.trim();
  return {
    offId: p.code,
    name,
    brand: brand ? brand : null,
    kcalPer100g: Math.round(kcalRaw * 100) / 100,
    proteinPer100g: n(nut.proteins_100g),
    carbsPer100g: n(nut.carbohydrates_100g),
    fatPer100g: n(nut.fat_100g),
  };
}

export async function searchOff(
  query: string,
  limit = 10,
): Promise<NormalizedFood[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OFF search HTTP ${res.status}`);
  const body = (await res.json()) as { products?: OffProduct[] };
  return (body.products ?? [])
    .map((p) => normalizeOffProduct(p))
    .filter((p): p is NormalizedFood => p !== null);
}

export async function fetchOffProduct(
  code: string,
): Promise<NormalizedFood | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    { headers: { "User-Agent": UA, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`OFF product HTTP ${res.status}`);
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  if (body.status !== 1 || !body.product) return null;
  return normalizeOffProduct({ ...body.product, code });
}
