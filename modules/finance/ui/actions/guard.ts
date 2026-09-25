import { headers } from "next/headers";
import { requireSameOrigin } from "../../auth/origin";
import { env } from "../../config/env";
export async function guardActionRequest(requestHeaders: Headers, options?: {
  appOrigin?: string; requireSession?: (cookieHeader: string | null) => Promise<unknown>;
}) {
  const appOrigin = options?.appOrigin ?? env.APP_ORIGIN;
  requireSameOrigin(new Request(appOrigin, { headers: requestHeaders }), { appOrigin });
  if (options?.requireSession) await options.requireSession(requestHeaders.get("cookie"));
}
export async function guardServerAction() { await guardActionRequest(new Headers(await headers())); }
