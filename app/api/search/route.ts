import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, configuredAccessPassword, verifyAccessSession } from "@/lib/access";
import { searchApplication } from "@/lib/server-search";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const password = configuredAccessPassword();
  if (!password || !verifyAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value, password)) {
    return Response.json({ error: "Prijavi se ponovo." }, { status: 401, headers });
  }
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (query.length < 2) return Response.json({ items: [] }, { headers });
  try {
    return Response.json({ items: await searchApplication(query) }, { headers });
  } catch {
    return Response.json({ error: "Pretraga trenutno nije dostupna. Pokušaj ponovo." }, { status: 503, headers });
  }
}
