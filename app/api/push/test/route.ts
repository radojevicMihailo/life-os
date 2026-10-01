import type { NextRequest } from "next/server";
import { pushHandlers } from "@/lib/notifications/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return pushHandlers().test(request); }
