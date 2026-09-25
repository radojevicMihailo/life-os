import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./constants";

const publicApiPaths = new Set(["/api/auth/bootstrap"]);
const independentApiPaths = new Set(["/api/v1/transactions"]);
const independentApiPrefixes = ["/api/cron"];
const protectedPagePrefixes = [
  "/finance",
  "/finance/transactions",
  "/finance/accounts",
  "/finance/budgets",
  "/finance/goals",
  "/finance/investments",
  "/finance/settings",
];

function hasExtension(pathname: string) {
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");

  return response;
}

export function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedDataApi(pathname: string) {
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (publicApiPaths.has(pathname)) {
    return false;
  }

  if (independentApiPaths.has(pathname)) {
    return false;
  }

  return !independentApiPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    hasExtension(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/access") {
    return withNoStore(NextResponse.next());
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    if (isProtectedPage(pathname)) {
      return withNoStore(NextResponse.redirect(new URL("/access", request.url)));
    }

    if (isProtectedDataApi(pathname)) {
      return withNoStore(
        NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
