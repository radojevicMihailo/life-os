import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, configuredAccessPassword, verifyAccessSession } from "@/lib/access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/icon.svg" || pathname === "/manifest.webmanifest") {
    return NextResponse.next();
  }
  if (pathname === "/api/health" && request.method === "GET") return NextResponse.next();
  if (pathname === "/access" && (request.method === "GET" || request.method === "HEAD")) return NextResponse.next();
  if (pathname === "/api/access/login" && request.method === "POST") return NextResponse.next();

  const password = configuredAccessPassword();
  if (password && verifyAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value, password)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    if (!pathname.startsWith("/api/")) {
      const response = NextResponse.redirect(new URL("/access", request.url));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export const config = { matcher: "/:path*" };
