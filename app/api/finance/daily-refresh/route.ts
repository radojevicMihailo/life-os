import { createDailyRefreshHandler } from "@/modules/finance/ui/cron-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: "integration_not_configured" }, { status: 503 });
  // Check the secret before loading database/provider code.
  return createDailyRefreshHandler({
    cronSecret: process.env.CRON_SECRET,
    refresh: async () => {
      const { refreshProductionValuations } = await import("@/modules/finance/application/production-refresh");
      return refreshProductionValuations();
    },
  })(request);
}
