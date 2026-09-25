import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { createPostHandler } from "@/modules/finance/ui/shortcut-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let productionHandler: ReturnType<typeof createPostHandler> | undefined;

async function getProductionHandler() {
  if (!productionHandler) {
    const [{ unitOfWork }, { readShortcutAccessSetting }] = await Promise.all([
      import("@/modules/finance/db/unit-of-work"),
      import("@/modules/finance/auth/settings"),
    ]);
    const application: ApplicationDependencies = {
      unitOfWork,
      ids: {
        nextId: (kind) => `${kind}-${randomUUID()}`,
      },
      clock: {
        now: () => new Date(),
      },
    };

    productionHandler = createPostHandler({
      application,
      readTokenHash: async () => (await readShortcutAccessSetting()).tokenHash,
    });
  }

  return productionHandler;
}

export async function POST(request: NextRequest) {
  if (!process.env.SHORTCUT_TOKEN_HASH || !process.env.ACCESS_TOKEN_PEPPER) return Response.json({ error: "integration_not_configured" }, { status: 503 });
  return (await getProductionHandler())(request);
}
