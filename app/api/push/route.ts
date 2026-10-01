import type { NextRequest } from "next/server";
import { pushHandlers } from "@/lib/notifications/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) { return pushHandlers().config(request); }
export async function POST(request: NextRequest) { return pushHandlers().subscribe(request); }
export async function DELETE(request: NextRequest) { return pushHandlers().unsubscribe(request); }
