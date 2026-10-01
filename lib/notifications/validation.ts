import { z } from "zod";

function providerEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash
      && (host === "web.push.apple.com" || host.endsWith(".push.apple.com")
        || host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com");
  } catch { return false; }
}
export const endpointSchema = z.string().max(2048).refine(providerEndpoint, "Unsupported push provider");
const key = (bytes: number) => z.string().regex(/^[A-Za-z0-9_-]+$/).max(128)
  .refine((value) => Buffer.from(value, "base64url").length === bytes, "Invalid push key");
export const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: key(65).refine((value) => Buffer.from(value, "base64url")[0] === 4, "Invalid public key"),
    auth: key(16),
  }),
});
export const endpointBodySchema = z.object({ endpoint: endpointSchema });
