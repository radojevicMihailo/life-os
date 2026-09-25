import type { NextRequest } from "next/server";

import { createProductionExportPost } from "../route-factory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const post = createProductionExportPost("accounts");
export async function POST(request: NextRequest) { return post(request); }
