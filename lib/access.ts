import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "life_os_access";
export const ACCESS_SESSION_SECONDS = 60 * 60 * 24 * 30;

export function configuredAccessPassword(): string | null {
  const password = process.env.LIFE_OS_ACCESS_PASSWORD;
  return password && password.length >= 24 ? password : null;
}

export function passwordMatches(candidate: string, password: string): boolean {
  const actual = createHash("sha256").update(password).digest();
  const supplied = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(actual, supplied);
}

function signature(payload: string, password: string): Buffer {
  return createHmac("sha256", password).update(payload).digest();
}

export function issueAccessSession(password: string, now = new Date()): string {
  const expires = Math.floor(now.getTime() / 1000) + ACCESS_SESSION_SECONDS;
  const payload = `${expires}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${signature(payload, password).toString("base64url")}`;
}

export function verifyAccessSession(token: string | undefined, password: string, now = new Date()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{22}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  if (expires <= Math.floor(now.getTime() / 1000)) return false;
  const supplied = Buffer.from(parts[2], "base64url");
  if (supplied.length !== 32) return false;
  return timingSafeEqual(supplied, signature(`${parts[0]}.${parts[1]}`, password));
}
