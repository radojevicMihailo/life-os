import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME } from "@/lib/access";

export function POST(request: NextRequest) {
  const origin = process.env.APP_ORIGIN ?? request.url;
  const response = NextResponse.redirect(new URL("/access", origin), { status: 303 });
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: new URL(origin).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
