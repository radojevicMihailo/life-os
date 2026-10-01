import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, configuredAccessPassword, verifyAccessSession } from "@/lib/access";
import { endpointBodySchema, subscriptionSchema } from "./validation";
import { sendToDevice } from "./delivery";
import type { VapidConfig } from "./config";
import type { PushSender, PushStore } from "./types";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function guard(request: NextRequest, mutation = true) {
  const password = configuredAccessPassword();
  if (!password || !verifyAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value, password)) return json({ error: "unauthorized" }, 401);
  if (mutation && request.headers.get("origin") !== new URL(process.env.APP_ORIGIN ?? request.url).origin) return json({ error: "forbidden" }, 403);
}
async function body(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) throw 413;
  // Read with a bound even when a client omits Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw 400;
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw 413; }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) { throw error === 413 ? 413 : 400; }
  finally { reader.releaseLock(); }
}
export function createPushHandlers(config: VapidConfig | null, store: PushStore, send: PushSender) {
  const mutation = (action: (value: unknown) => Promise<Response>, needsConfig = true) => async (request: NextRequest) => {
    const blocked = guard(request);
    if (blocked) return blocked;
    if (needsConfig && !config) return json({ error: "push_not_configured" }, 503);
    try { return await action(await body(request)); }
    catch (error) {
      if (error === 400 || error === 413) return json({ error: "invalid_request" }, error);
      console.error("[push] API operation failed");
      return json({ error: "push_operation_failed" }, 500);
    }
  };
  return {
    async config(request: NextRequest) { return guard(request, false) ?? json({ configured: !!config, publicKey: config?.publicKey ?? null }); },
    subscribe: mutation(async (value) => {
      const parsed = subscriptionSchema.safeParse(value);
      if (!parsed.success) return json({ error: "invalid_subscription" }, 400);
      await store.upsertDevice(parsed.data, config!.publicKey);
      return json({ ok: true });
    }),
    unsubscribe: mutation(async (value) => {
      const parsed = endpointBodySchema.safeParse(value);
      if (!parsed.success) return json({ error: "invalid_subscription" }, 400);
      await store.removeEndpoint(parsed.data.endpoint);
      return json({ ok: true });
    }, false),
    test: mutation(async (value) => {
      const parsed = endpointBodySchema.safeParse(value);
      if (!parsed.success) return json({ error: "invalid_subscription" }, 400);
      const device = await store.findDevice(parsed.data.endpoint);
      if (!device || device.vapidPublicKey !== config!.publicKey) return json({ error: "subscription_missing" }, 404);
      const outcome = await sendToDevice(store, send, device, { title: "Life OS", body: "Test notifikacija — podsetnici su uključeni na ovom uređaju.", url: "/notifications", tag: `test:${Date.now()}` }, 60);
      return outcome === "sent" ? json({ ok: true }) : json({ error: outcome === "expired" ? "subscription_expired" : "push_delivery_failed" }, outcome === "expired" ? 410 : 502);
    }),
  };
}
