import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_SESSION_SECONDS, configuredAccessPassword, issueAccessSession, passwordMatches } from "@/lib/access";

export async function POST(request: NextRequest) {
  const origin = process.env.APP_ORIGIN ?? request.url;
  const password = configuredAccessPassword();
  if (!password) return NextResponse.json({ error: "access_not_configured" }, { status: 503 });
  const form = await request.formData();
  const candidate = form.get("password");
  if (typeof candidate !== "string" || !passwordMatches(candidate, password)) {
    return NextResponse.redirect(new URL("/access?error=1", origin), { status: 303 });
  }
  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  response.cookies.set(ACCESS_COOKIE_NAME, issueAccessSession(password), {
    httpOnly: true,
    secure: new URL(origin).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
