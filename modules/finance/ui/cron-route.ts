import { randomUUID } from "node:crypto";

import {
  operationalLogger,
  type OperationalLogger,
} from "../observability/log";

export function createDailyRefreshHandler(input: {
  clock?: { now(): Date };
  cronSecret: string;
  createRequestId?: () => string;
  logger?: OperationalLogger;
  refresh(): Promise<{
    failedCount: number;
    runIds: string[];
    succeededCount: number;
  }>;
}) {
  const clock = input.clock ?? { now: () => new Date() };
  const createRequestId = input.createRequestId ?? randomUUID;
  const logger = input.logger ?? operationalLogger;

  return async function dailyRefresh(request: Request) {
    const startedAt = clock.now().getTime();
    const requestId = createRequestId();

    if (request.headers.get("authorization") !== `Bearer ${input.cronSecret}`) {
      logger.warn("valuation.daily_refresh.rejected", {
        durationMs: clock.now().getTime() - startedAt,
        errorCode: "unauthorized",
        provider: "all",
        requestId,
        status: "unauthorized",
      });
      return Response.json(
        { error: "unauthorized" },
        { headers: { "x-request-id": requestId }, status: 401 },
      );
    }

    try {
      const result = await input.refresh();
      logger.info("valuation.daily_refresh.completed", {
        durationMs: clock.now().getTime() - startedAt,
        ...(result.failedCount > 0 ? { errorCode: "partial_refresh" } : {}),
        provider: "all",
        requestId,
        status: result.failedCount > 0 ? "partial" : "success",
      });
      return Response.json(result, {
        headers: { "x-request-id": requestId },
      });
    } catch {
      logger.error("valuation.daily_refresh.failed", {
        durationMs: clock.now().getTime() - startedAt,
        errorCode: "refresh_failed",
        provider: "all",
        requestId,
        status: "failed",
      });
      return Response.json(
        { error: "refresh_failed" },
        { headers: { "x-request-id": requestId }, status: 500 },
      );
    }
  };
}
