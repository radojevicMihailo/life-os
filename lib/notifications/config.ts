import "server-only";
import webpush from "web-push";
export type VapidConfig = { publicKey: string; privateKey: string; subject: string };
export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  try {
    // Validate the key pair/subject using the transport library, without making a request.
    webpush.getVapidHeaders("https://web.push.apple.com", subject, publicKey, privateKey, "aes128gcm");
    return { publicKey, privateKey, subject };
  } catch { return null; }
}
